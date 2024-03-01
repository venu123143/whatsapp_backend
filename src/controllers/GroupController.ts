import Group from '../models/GroupModel'
import User from '../models/UserModel'
import Message, { IChatMessage } from '../models/MessageModel'
import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs"
import { uploadImage } from '../utils/Cloudinary';
// Controller functions
export const createGroup = async (req: Request, res: Response) => {
  const formData = req.body;
  const name = req.body?.name
  const users = JSON.parse(formData.users)

  try {

    const uploader = (path: string) => uploadImage(path);
    const files = req.files as Express.Multer.File[];
    
    let profile = ""
    for (const file of files) {
      const { path } = file;
      const newpath = await uploader(path);
      profile = newpath.url
      fs.unlinkSync(path);
    }

    if (!users.includes(req.user?._id)) {
      users.push(req.user?._id);
    }
    console.log(name, profile);

    if (users.length <= 50) {
      const group = await Group.create({
        name: name,
        socket_id: uuidv4(),
        users: users,
        profile: profile,
        admins: req.user?._id,
        createdBy: req.user?._id
      })

      const populatedGroup = await Group.findById(group._id)
        .populate([
          { path: 'users', model: User },
          { path: 'createdBy', model: User },
          { path: 'admins', model: User },
        ])
        .exec();
      res.status(201).json(populatedGroup);
    } else {
      res.status(400).json({ error: 'Number of users exceeds the limit' });
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getGroups = async (req: Request, res: Response) => {
  const userId = req.user?._id
  try {
    const groups = await Group.find({
      $or: [
        { users: { $in: [userId] } },   // Check if user is in the 'users' array
        { admins: { $in: [userId] } },  // Check if user is in the 'admins' array
        { createdBy: userId }, // Check if user is the creator of the group
      ]
    }).populate([
      { path: 'users', model: User },
      { path: 'createdBy', model: User },
      { path: 'admins', model: User },
    ]);
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getGroupById = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  // const formData = req.body;
  const name = req.body?.name
  // const users = JSON.parse(formData.users)
  const uploader = (path: string) => uploadImage(path);
  const files = req.files as Express.Multer.File[];
  let profile = ""
  for (const file of files) {
    const { path } = file;
    const newpath = await uploader(path);
    profile = newpath.url
    fs.unlinkSync(path);
  }
  const status = req.body.status;
  const description = req.body.description;

  try {
    const group = await Group.findByIdAndUpdate(groupId, { name, status, description, profile }, { new: true });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  try {
    const group = await Group.findByIdAndDelete(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(204).json({ message: 'Group deleted...!' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addUserToGroup = async (req: Request, res: Response) => {
  const groupId = req.params.groupId;
  const userIdToAdd = req.body._id;
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.users.length < 50) {
      const result = await Group.findByIdAndUpdate(
        groupId,
        { $addToSet: { users: userIdToAdd } },
        { new: true }
      );
      res.status(200).json(result);
    } else {
      res.status(400).json({ error: "Can't add user, Group reaches the max Limit 50 ." });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addAdminToGroup = async (req: Request, res: Response) => {
  const groupId = req.params.groupId;
  const adminIdToAdd = req.body._id;
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (group.admins.length < 50) {
      const result = await Group.findByIdAndUpdate(
        groupId,
        { $addToSet: { admins: adminIdToAdd } },
        { new: true }
      );
      res.status(200).json(result);
    } else {
      res.status(400).json({ error: "Can't add user, Group reaches the max Limit 50 ." });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteUserFromAdmins = async (req: Request, res: Response) => {
  const groupId = req.params.groupId;
  const userIdToDelete = req.body._id;

  try {
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { admins: userIdToDelete } },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const leaveUserFromGroup = async (req: Request, res: Response) => {
  const groupId = req.params.groupId;
  const userIdToRemove = req.body._id;

  try {
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { users: userIdToRemove } },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const backupMessages = async (req: Request, res: Response) => {
  try {
    const groupId = req.params.groupId;
    const messages = await Message.find({ recieverId: groupId }).populate('senderId', 'username');

    if (messages.length === 0) {
      return res.status(404).json({ error: 'No messages found for the group' });
    }

    const backupData = messages.map((message: any) => {
      return {
        message: message.message,
        msg_type: message.msg_type,
        seen: message.seen,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        senderId: message.senderId,
        recieverId: message.recieverId,
      };
    });

    // Save the messages to a JSON file or perform any other backup operation
    const backupFileName = `backup_group_${groupId}_${Date.now()}.json`;
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));

    res.status(200).json({ success: true, backupFileName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
