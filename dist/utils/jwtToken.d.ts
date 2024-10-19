import { IUser } from "../models/UserModel.js";
declare const jwtToken: (user: IUser) => Promise<string>;
export default jwtToken;
