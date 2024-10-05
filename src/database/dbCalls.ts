import MessageModel from '../models/ChatModel';  // Assuming the model is in this path

// Function to create a message in MongoDB
async function createMessage(message: any) {
    const newMessage = new MessageModel({
        room_id: message.room_id,
        message: message.message,
        file: message.file,
        date: message.date,
        msgType: message.msgType,
        sender: {
            id: message.sender.id,
            name: message.sender.name,
            mobile: message.sender.mobile
        },
        conn_type: message.conn_type,
        seen: message.seen,
        replyFor: message.replyFor ? {
            id: message.replyFor.id,
            message: message.replyFor.message,
            name: message.replyFor.name
        } : null  // Only include replyFor if it exists
    });

    // Save the message to MongoDB
    const savedMessage = await newMessage.save();
    return savedMessage

}

export default {
    createMessage
};
