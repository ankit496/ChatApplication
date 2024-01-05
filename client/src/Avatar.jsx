import React from 'react'

const Avatar = ({username,userId,online}) => {
    const colors=['bg-red-200','bg-green-200','bg-purple-200','bg-blue-200','bg-yellow-200','bg-teal-200']
    const userIdBase10=parseInt(userId,16)
    const color=colors[userIdBase10%colors.length]
    return (
    <div className={'w-8 h-8 relative rounded-full flex items-center '+color}>
        <div className='text-center w-full opacity-70'>
            {username[0].toUpperCase()}
        </div>
        {online && (<div className='absolute w-2.5 h-2.5 rounded-full border border-white bg-yellow-400 bottom-0 right-0'></div>)}
        {!online && (<div className='absolute w-2.5 h-2.5 rounded-full border border-white bg-gray-400 bottom-0 right-0'></div>)}
    </div>
  )
}

export default Avatar