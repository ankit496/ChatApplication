import React, { useContext, useEffect, useState } from 'react'
import Avatar from './Avatar'
import Logo from './Logo'
import { UserContext } from './context/UserContext'
const Chat = () => {
    const [ws, setWs] = useState(null)
    const [onlinePeople, setOnlinePeople] = useState({})
    const [selectedUserId,setSelectedUserId]=useState(null)
    const {username,id}=useContext(UserContext)
    function handleMessage(e) {
        console.log('new message', e)
    }
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:4000")
        setWs(ws)
        ws.addEventListener('message', handleMessage)
    }, [])
    function showOnlinePeople(peopleArray) {
        const people = {}
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username
        });
        setOnlinePeople(people)
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data)
        if (messageData.online) {
            showOnlinePeople(messageData.online)
        }
    }
    
    const onlinePeopleExclUser={...onlinePeople}
    delete onlinePeopleExclUser[id]
    return (
        <div className='flex h-screen'>
            <div className="bg-white-100 w-1/3 font-bold" >
                <Logo></Logo>
                {Object.keys(onlinePeopleExclUser).map(userId => (
                    <div onClick={()=>setSelectedUserId(userId)} 
                        className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer " +(userId===selectedUserId?'bg-blue-50':'')}
                        key={userId}>
                        {userId===selectedUserId && (
                            <div className='w-1 bg-blue-500 h-12 rounded-r-md'/>
                        )}
                        <div className="flex gap-2 py-2 pl-4 items-center">
                            <Avatar username={onlinePeople[userId]} userId={userId}/>
                            <span className='text-gray-800'/>{onlinePeople[userId]}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className='flex-grow'>
                    {!selectedUserId && (
                        <div className='flex items-center justify-center h-full'>
                            <div className='text-gray-300 text-lg'>&larr;Tap on User to Chat</div>
                        </div>
                    )}
                </div>
                <div className='flex gap-2'>
                    <input type="text" placeholder='Type Your Message Here' className='flex-grow bg-white border rounded-sm p-2' />
                    <button className='bg-blue-500 p-2 text-white border rounded-sm'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Chat