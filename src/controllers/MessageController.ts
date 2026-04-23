import Message from "../models/MessageModel";
import { Request, Response } from "express";

export const createMessage = async (req: Request, res: Response) => {
  const message = req.body?.message;
  try {
    const msg = await Message.create({ message });
    res.json(msg);
  } catch (error: any) {
    throw new Error(error);
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  const id = req.body?.id;
  const message = req.body?.message;
  const seen = req.body?.seen;
  try {
    const msg = await Message.findByIdAndUpdate(
      id,
      { message, seen },
      { new: true }
    );
    res.json(msg);
  } catch (error: any) {
    throw new Error(error);
  }
};