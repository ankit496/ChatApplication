const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
dotenv.config()
const User = require('./models/User')
const cors = require('cors')
const cookieParser=require('cookie-parser')
const bcrypt=require('bcryptjs')
const bcryptSalt=bcrypt.genSaltSync(10)
const ws=require('ws')

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
        const hashedPassword=bcrypt.hashSync(password,bcryptSalt)
        const createdUser = await User.create({ 
            username:username,
            password:hashedPassword
        })
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
app.post('/login',async (req,res)=>{
    const {username,password}=req.body
    const foundUser=await User.findOne({username:username})
    if(foundUser){
        const passOK=bcrypt.compareSync(password,foundUser.password)
        if(passOK){
            jwt.sign({ userId: foundUser._id,username }, process.env.JWT_SECRET, {}, (err, token) => {
                if (err)
                    throw err
                res.cookie('token', token,{sameSite:'none',secure:true}).status(201).json({
                    id: foundUser._id
                })
            })
        }
    }
})

const server=app.listen(4000)

const wss=new ws.WebSocketServer({server})
wss.on('connection',(connection,req)=>{
    const cookies=req.headers.cookie
    if(cookies){
        const tokenCookieString=cookies.split(';').find(str=>str.startsWith('token='))
        if(tokenCookieString){
            const token=tokenCookieString.split('=')[1]
            if(token){
                jwt.verify(token,process.env.JWT_SECRET,{},(err,userdata)=>{
                    if(err)
                        throw err
                    const {userId,username}=userdata
                    connection.userId=userId
                    connection.username=username
                })
            }
        }      
    }
    [...wss.clients].forEach(client=>{
        client.send(JSON.stringify({
            online:[...wss.clients].map(c=>({userId:c.userId,username:c.username}))
    }))
    })
})