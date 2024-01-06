const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
dotenv.config()
const User = require('./models/User')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const bcryptSalt = bcrypt.genSaltSync(10)
const ws = require('ws')
const fs=require('fs')
const Message=require('./models/Message')

const app = express()
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}))
app.use('/uploads',express.static(__dirname+'/uploads/'))
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
    else {
        res.status(401).json('no token')
    }
})
app.post('/register', async (req, res) => {
    const { username, password } = req.body
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({
            username: username,
            password: hashedPassword
        })
        jwt.sign({ userId: createdUser._id, username }, process.env.JWT_SECRET, {}, (err, token) => {
            if (err)
                throw err
            res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                id: createdUser._id
            })
        })
    }
    catch (err) {
        throw err
    }
})
app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const foundUser = await User.findOne({ username: username })
    if (foundUser) {
        const passOK = bcrypt.compareSync(password, foundUser.password)
        if (passOK) {
            jwt.sign({ userId: foundUser._id, username }, process.env.JWT_SECRET, {}, (err, token) => {
                if (err)
                    throw err
                res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
                    id: foundUser._id
                })
            })
        }
    }
})

app.post('/logout',async(req,res)=>{
    res.cookie('token','',{sameSite:'none',secure:'true'}).json('ok')
})
async function getUserDataFromRequest(req){
    return new Promise((resolve,reject)=>{
        const {token}=req.cookies;
        if(token){
            jwt.verify(token,process.env.JWT_SECRET,{},(err,userData)=>{
                if(err) throw err;
                resolve(userData)
            })
        }
        else{
            reject('no token')
        }
    })
}
app.get('/messages/:userId',async(req,res)=>{
    const {userId}=req.params
    const userData=await getUserDataFromRequest(req)
    const ourUserId=userData.userId
    const messages=await Message.find({
        sender:{$in:[userId,ourUserId]},
        recipient:{$in:[userId,ourUserId]}
    }).sort({createdAt:1})
    res.json(messages);
})
app.get('/people',async(req,res)=>{
    const users=await User.find({},{'_id':1,username:1})
    res.json(users)
})

const server = app.listen(4000)

const wss = new ws.WebSocketServer({ server })
wss.on('connection', (connection, req) => {
    
    function notifyAboutOnlinePeople(){
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
            }))
        })
    }

    connection.isAlive=true

    connection.timer=setInterval(()=>{
        connection.ping()
        connection.deathTimer=setTimeout(()=>{
            connection.isAlive=false;
            connection.terminate()
            clearInterval(connection.timeout)
            notifyAboutOnlinePeople()
            // console.log('dead')
        },1000)
    },5000)
    
    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer)
    })
    const cookies = req.headers.cookie
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='))
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1]
            if (token) {
                jwt.verify(token, process.env.JWT_SECRET, {}, (err, userdata) => {
                    if (err)
                        throw err
                    const { userId, username } = userdata
                    connection.userId = userId
                    connection.username = username
                })
            }
        }
    }
    connection.on('message', async (message) => {
        const messageData=JSON.parse(message.toString())
        const {recipient,text,file}=messageData
        let filename=null
        if(file){
            const parts=file.info.split('.')
            const ext=parts[parts.length-1]
            filename=Date.now()+'.'+ext
            const path=(__dirname+'/uploads/'+filename)
            const bufferData=new Buffer.from(file.data.split(',')[1],'base64')
            fs.writeFile(path,bufferData,()=>{
                console.log('file Saved',path)
            })
        }
        if(recipient && (text||file)){
            const messageDoc=await Message.create({
                sender:connection.userId,
                recipient,
                text,
                file:file?filename:null
            });
            [...wss.clients]
                .filter(c=>c.userId===recipient)
                .forEach(c=>c.send(JSON.stringify({text,sender:connection.userId,recipient,file:file?filename:null,_id:messageDoc._id})))
        }
    });
    //notify everyone about online people when someone connects
    notifyAboutOnlinePeople()
})