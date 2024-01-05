import React, { useContext, useEffect, useState, useRef } from 'react'
import Avatar from './Avatar'
import Logo from './Logo'
import { UserContext } from './context/UserContext'
import { uniqBy } from 'lodash'
import Contact from './Contacts'
import axios from 'axios';
const Chat = () => {
    const [ws, setWs] = useState(null)
    const [onlinePeople, setOnlinePeople] = useState({})
    const [selectedUserId, setSelectedUserId] = useState(null)
    const [newmessage, setNewMessage] = useState('')
    const [messages, setMessages] = useState([])
    const [offlinePeople, setOfflinePeople] = useState({})
    const divUnderMessages = useRef()
    const { username, id } = useContext(UserContext)
    useEffect(() => {
        connectToWs()
    }, [])
    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data.filter(p => p._id !== id).filter(p => !Object.keys(onlinePeople).includes(p._id))
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p
            })
            setOfflinePeople(offlinePeople)
            console.log(offlinePeople)
        })
    }, [onlinePeople])
    function connectToWs() {
        const ws = new WebSocket("ws://localhost:4000")
        setWs(ws)
        ws.addEventListener('message', handleMessage)
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log('Disconnected, Trying to reconnect')
                connectToWs()
            }, 1000)
        })
    }
    function showOnlinePeople(peopleArray) {
        const people = {}
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username
        });
        setOnlinePeople(people)
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data)
        if ('online' in messageData) {
            showOnlinePeople(messageData.online)
        }
        else if ('text' in messageData) {
            setMessages(prev => [...prev, { ...messageData }])
        }
    }
    function sendMessage(e) {
        e.preventDefault()
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newmessage
        }))
        setNewMessage('')
        setMessages(prev => ([...prev, { text: newmessage, sender: id, recipient: selectedUserId, _id: Date.now() }]))
    }
    useEffect(() => {
        const div = divUnderMessages.current;
        if (div)
            div.scrollIntoView({ behaviour: 'smooth', block: 'end' })
    }, [messages])

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                const { data } = res
                setMessages(data)
            })
        }
    }, [selectedUserId])

    const onlinePeopleExclUser = { ...onlinePeople }
    delete onlinePeopleExclUser[id]
    const uniqueMessages = uniqBy(messages, '_id');

    return (
        <div className='flex h-screen'>
            <div className="bg-white-100 w-1/3 font-bold" >
                <Logo></Logo>
                {Object.keys(onlinePeopleExclUser).map(userId => (
                    <Contact
                        key={userId}
                        id={userId}
                        online={true}
                        username={onlinePeopleExclUser[userId]}
                        onClick={() => { setSelectedUserId(userId); console.log({ userId }) }}
                        selected={userId === selectedUserId} />
                ))}
                {Object.keys(offlinePeople).map(userId => (
                    <Contact
                        key={userId}
                        id={userId}
                        online={false}
                        username={offlinePeople[userId].username}
                        onClick={() => setSelectedUserId(userId)}
                        selected={userId === selectedUserId} />
                ))}
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className='flex-grow'>
                    {!selectedUserId && (
                        <div className='flex items-center justify-center h-full'>
                            <div className='text-gray-300 text-lg'>&larr;Tap on User to Chat</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {uniqueMessages.map(message => (
                                    <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                        <div className={"text-left inline-block p-2 my-2 rounded-md text-sm " + (message.sender === id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className='flex gap-2' onSubmit={sendMessage}>
                        <input type="text"
                            value={newmessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder='Type Your Message Here'
                            className='flex-grow bg-white border rounded-sm p-2' />
                        <button className='bg-blue-500 p-2 text-white border rounded-sm'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default Chat