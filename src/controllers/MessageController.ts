import Message from "../models/MessageModel";
import { Request, Response } from "express";

export const createMessage = async (req: Request, res: Response) => {
  const title = req.body?.title;
  try {
    const msg = await Message.create({ title });
    res.json(msg);
  } catch (error: any) {
    throw new Error(error);
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  const id = req.body?.id;
  const title = req.body?.title;
  const seen = req.body?.seen;
  try {
    const msg = await Message.findByIdAndUpdate(
      id,
      { title, seen },
      { new: true }
    );
    res.json(msg);
  } catch (error: any) {
    throw new Error(error);
  }
};