import { IUser } from "../models/UserModel.js"
import { Response, CookieOptions } from "express";

const jwtToken = async (user: IUser, statusCode: number, res: Response) => {
    const token = await user.generateAuthToken()
    if (token !== undefined) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 3); // Add 3 days
        const options: CookieOptions = {
            expires: expirationDate,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }
        res.status(statusCode).cookie('loginToken', token, options).json({
            user,
            sucess: true,
            message: "user logged in sucessfully"
        })
    } else {
        console.log('token is undefined');
    }
}




export default jwtToken