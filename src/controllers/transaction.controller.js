import accountModel from "../models/account.model.js"
import ledgerModel from "../models/ledger.model.js"
import transactionModel from "../models/transaction.model.js"
import mongoose, { MongooseError } from "mongoose"
import { sendTransactionEmail } from "../services/email.service.js"
import userModel from "../models/user.model.js"

async function createTransaction(req, res) {
  const { fromAccount, toAccount, amount, idempotency } = req.body

  if (!fromAccount || !toAccount || !amount || !idempotency) {
    return res.status(400).json({
      message: "FromAccount, toAccount, amount and idempotency are required"
    })
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount
  })

  const toUserAccount = await accountModel.findOne({
    _id: toAccount
  })

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({
      message: "FromAccount or toAccount not found"
    })
  }

  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotency: idempotency
  })

  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: isTransactionAlreadyExists
      })
    }
    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing",
      })
    }
    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction processing failed, please retry",
      })
    }
    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed, please retry",
      })
    }
  }

  if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
    return res.status(500).json({
      message: "Both from account and to account must be ACTIVE to process transaction"
    })
  }

  const balance = await fromUserAccount.getBalance()

  if (balance < amount) {
    return res.status(400).json({
      message: `From account has insufficient balance, current balance is ${balance}. Requested amount is ${amount}`
    })
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  const transaction = await transactionModel.create({
    fromAccount,
    toAccount,
    amount,
    idempotency,
    status: "PENDING"
  }, { session })

  const debitLedgerEntry = await ledgerModel.create({
    account: fromAccount,
    amount: amount,
    transaction: transaction._id,
    type: "DEBIT"
  }, { session })

  const creditLedgerEntry = await ledgerModel.create({
    account: toAccount,
    amount: amount,
    transaction: transaction._id,
    type: "CREDIT"
  }, { session })

  transaction.status = "COMPLETED"
  await transaction.save({ session })

  await session.commitTransaaction()
  session.endSession()

  await sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

  return res.status(201).json({
    message: "Transaction processed successfully",
    transaction: transaction
  })
}

async function createInitialFundsTransactions(req, res) {
  const { toAccount, amount, idempotency } = req.body

  if (!toAccount || !amount || !idempotency) {
    return res.status(400).json({
      message: "toAccount, amount and idempotency are required"
    })
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount
  })

  if (!toUserAccount) {
    return res.status(400).json({
      message: "toAccount not found"
    })
  }

  const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

 const session = await mongoose.startSession()
session.startTransaction()

try {
  // 1️⃣ Create transaction first and SAVE it
  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotency,
    status: "PENDING",
  })

  await transaction.save({ session })

  // 2️⃣ Now create ledger entries
  await ledgerModel.create([
    {
      account: fromUserAccount._id,
      amount,
      transaction: transaction._id,
      type: "DEBIT"
    },
    {
      account: toAccount,
      amount,
      transaction: transaction._id,
      type: "CREDIT"
    }
  ], { session,ordered: true })

  // 3️⃣ Update transaction status
  transaction.status = "COMPLETED"
  await transaction.save({ session })

  await session.commitTransaction()
  session.endSession()

  return res.status(201).json({
    message: "Initial funds transaction processed successfully",
    transaction
  })

} catch (error) {
  await session.abortTransaction()
  session.endSession()
  console.error(error)

  return res.status(500).json({
    message: "Transaction failed",
    error: error.message
  })
}

}

export { createTransaction, createInitialFundsTransactions }