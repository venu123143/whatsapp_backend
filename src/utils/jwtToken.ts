import { IUser } from "../models/UserModel.js"
import { Response, CookieOptions } from "express";

const jwtToken = async (user: IUser, statusCode: number, res: Response) => {
    const token = await user.generateAuthToken()
    if (token !== undefined) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 3); // Add 3 days
        // maxAge: 24 * 60 * 60 * 1000 * 2,
        // maxAge = 24 * 60 * 60 * 1000 = 1 day 
        const options: CookieOptions = {
            expires: expirationDate,
            secure: true,
            httpOnly: true,
            sameSite: "none",
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