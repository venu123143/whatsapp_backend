import User from '../models/UserModel'
import Calls from '../models/CallsModel'
import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs"
import asyncHandler from "express-async-handler"
import FancyError from '../utils/FancyError';
import { createCallSchema } from '../middleware/JoiSchemas';



export const createCall = asyncHandler(async (req: Request, res: Response) => {
    try {
        const user = req.user
        if (!user) {
            throw new FancyError("user not found, login again.", 403)
        }
        await createCallSchema.validateAsync(req.body);
        const { title, callType, pin } = req.body
        const create = await Calls.create({ title, callType, pin, status: 'live', createdBy: user.id, socketId: uuidv4() })
        res.status(200).json({ message: 'your call has started ', data: create })
    } catch (error: any) {
        const errorMessage = error?.details ? error.details[0].message.replace(/["\\]/g, '') : error.message;
        res.status(500).json({ message: errorMessage })
    }


})
export const getCalls = asyncHandler(async (req: Request, res: Response) => {
    try {
        const user = req.user
        if (!user) {
            throw new FancyError("user not found, login again.", 403)
        }
        const userId = req.user?.id
        const { page = 1, limit = 10 } = req.query; // Default page and limit
        const pageNumber = parseInt(page as string, 10); // Convert to number
        const limitNumber = parseInt(limit as string, 10); // Convert to number

        // Calculate skip for pagination
        const skip = (pageNumber - 1) * limitNumber;
        const calls = await Calls.find({
            $or: [
                { createdBy: userId },
                { joinedUsers: { $in: [userId] } },
            ],
            status: 'completed',
        }).sort({ createdAt: -1 }).skip(skip)
            .limit(limitNumber)
            .populate({
                path: 'createdBy',
                select: 'socket_id name profile mobile _id', // Only these fields
            }).populate({
                path: 'joinedUsers',
                select: 'socket_id name profile mobile _id', // Only these fields
            })

        res.status(200).json({ message: 'Your recent calls history fetched.', data: calls })
    } catch (error: any) {
        const errorMessage = error?.details ? error.details[0].message.replace(/["\\]/g, '') : error.message;
        res.status(500).json({ message: errorMessage })
    }

})
export const getLiveCalls = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status = 'live' } = req.query; // Default values for page, limit, and status
        const user = req.user
        if (!user) {
            throw new FancyError("user not found, login again.", 403)
        }
        const pageNumber = parseInt(page as string, 10); // Convert page to number
        const limitNumber = parseInt(limit as string, 10); // Convert limit to number

        const calls = await Calls.find({
            status: status
        }).skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .populate({
                path: 'createdBy',
                select: 'socket_id name profile mobile _id', // Only these fields
            }).populate({
                path: 'joinedUsers',
                select: 'socket_id name profile mobile _id', // Only these fields
            })
        res.status(200).json({ message: 'live calls fetched successfully. ', data: calls })

    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }

})
export const updateCall = asyncHandler(async (req: Request, res: Response) => {
    try {
        const id = req.params.id
        const status = req.body.status
        const userId = req.body.userId
        const callDuration = req.body.callDuration

        const updateObject: any = {};

        if (userId) {
            updateObject.$addToSet = { joinedUsers: userId };
        }
        if (status) {
            updateObject.status = status; // If status is provided
        }
        if (callDuration) {
            updateObject.callDuration = callDuration; // If callDuration is provided
        }

        const updatedCall = await Calls.findByIdAndUpdate(id, updateObject, { new: true })

        if (!updatedCall) {
            throw new FancyError("Call not found.", 404); // Call ID doesn't exist
        }
        res.status(200).json({
            message: 'Call updated successfully.',
            data: updatedCall,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message })

    }
})
