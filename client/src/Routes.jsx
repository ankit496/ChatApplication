import React, { useContext } from 'react'
import Register from './Register'
import { UserContext } from './context/UserContext'
const Routes = () => {
    const { username, id } = useContext(UserContext)
    
    return (
        <div>
            <Register></Register>
        </div>
    )
}

export default Routes