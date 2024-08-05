import { IUser } from "../models/UserModel.js"

const jwtToken = async (user: IUser) => {
    const token = await user.generateAuthToken()
    return token
}




export default jwtToken