const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
dotenv.config()
const User = require('./models/User')
const cors = require('cors')
const cookieParser=require('cookie-parser')


const app = express()
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}))
app.use(express.json())
app.use(cookieParser())

const mongoUrl = process.env.MONGO_URL
mongoose.connect(mongoUrl)
const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error"))
db.once("open", () => {
    console.log('Database connected')
})

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
            if (err)
                throw err
            console.log(userData)
            res.json(userData);
        })
    }
    else{
        res.status(401).json('no token')
    }
})
app.post('/register', async (req, res) => {
    const { username, password } = req.body
    try {
        const createdUser = await User.create({ username, password })
        jwt.sign({ userId: createdUser._id,username }, process.env.JWT_SECRET, {}, (err, token) => {
            if (err)
                throw err
            res.cookie('token', token,{sameSite:'none',secure:true}).status(201).json({
                id: createdUser._id
            })
        })
    }
    catch (err) {
        throw err
    }
})


app.listen(4000, () => {
    console.log('app started on port 4000')
})