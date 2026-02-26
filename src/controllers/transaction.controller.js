import accountModel from "../models/account.model.js"
import transactionModel from "../models/transaction.model.js"


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


}