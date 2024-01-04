import React, { useContext } from 'react'
import RegisterAndLoginForm from './RegisterAndLoginForm'
import { UserContext } from './context/UserContext'
import Chat from './Chat'
const Routes = () => {
    const { username, id } = useContext(UserContext)
    if(username){
        return <Chat/>
    }
    return (
        <div>
            <RegisterAndLoginForm></RegisterAndLoginForm>
        </div>
    )
}

export default Routes