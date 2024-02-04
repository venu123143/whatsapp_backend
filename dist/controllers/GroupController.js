"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupMessages = exports.leaveUserFromGroup = exports.deleteUserFromAdmins = exports.addAdminToGroup = exports.addUserToGroup = exports.deleteGroup = exports.updateGroup = exports.getGroupById = exports.getGroups = exports.createGroup = void 0;
const GroupModel_1 = __importDefault(require("../models/GroupModel"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const MessageModel_1 = __importDefault(require("../models/MessageModel"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const createGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const name = req.body.name;
    const users = req.body.users;
    const profile = (_a = req.body) === null || _a === void 0 ? void 0 : _a.profile;
    if (!users.includes((_b = req.user) === null || _b === void 0 ? void 0 : _b._id)) {
        users.push((_c = req.user) === null || _c === void 0 ? void 0 : _c._id);
    }
    console.log(name, users, profile);
    try {
        if (users.length <= 50) {
            const group = yield GroupModel_1.default.create({
                name: name,
                socket_id: (0, uuid_1.v4)(),
                users: users,
                profile: profile,
                admins: (_d = req.user) === null || _d === void 0 ? void 0 : _d._id,
                createdBy: (_e = req.user) === null || _e === void 0 ? void 0 : _e._id
            });
            const populatedGroup = yield GroupModel_1.default.findById(group._id)
                .populate([
                { path: 'users', model: UserModel_1.default },
                { path: 'createdBy', model: UserModel_1.default },
                { path: 'admins', model: UserModel_1.default },
            ])
                .exec();
            res.status(201).json(populatedGroup);
        }
        else {
            res.status(400).json({ error: 'Number of users exceeds the limit' });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.createGroup = createGroup;
const getGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    const userId = (_f = req.user) === null || _f === void 0 ? void 0 : _f._id;
    try {
        const groups = yield GroupModel_1.default.find({
            $or: [
                { users: { $in: [userId] } },
                { admins: { $in: [userId] } },
                { createdBy: userId },
            ]
        }).populate([
            { path: 'users', model: UserModel_1.default },
            { path: 'createdBy', model: UserModel_1.default },
            { path: 'admins', model: UserModel_1.default },
        ]);
        res.status(200).json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getGroups = getGroups;
const getGroupById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    try {
        const group = yield GroupModel_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(200).json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getGroupById = getGroupById;
const updateGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    const name = req.body.name;
    const status = req.body.status;
    const description = req.body.description;
    const profile = req.body.profile;
    try {
        const group = yield GroupModel_1.default.findByIdAndUpdate(groupId, { name, status, description, profile }, { new: true });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(200).json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.updateGroup = updateGroup;
const deleteGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    try {
        const group = yield GroupModel_1.default.findByIdAndDelete(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(204).json({ message: 'Group deleted...!' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.deleteGroup = deleteGroup;
const addUserToGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.groupId;
    const userIdToAdd = req.body._id;
    try {
        const group = yield GroupModel_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (group.users.length < 50) {
            const result = yield GroupModel_1.default.findByIdAndUpdate(groupId, { $addToSet: { users: userIdToAdd } }, { new: true });
            res.status(200).json(result);
        }
        else {
            res.status(400).json({ error: "Can't add user, Group reaches the max Limit 50 ." });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.addUserToGroup = addUserToGroup;
const addAdminToGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.groupId;
    const adminIdToAdd = req.body._id;
    try {
        const group = yield GroupModel_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (group.admins.length < 50) {
            const result = yield GroupModel_1.default.findByIdAndUpdate(groupId, { $addToSet: { admins: adminIdToAdd } }, { new: true });
            res.status(200).json(result);
        }
        else {
            res.status(400).json({ error: "Can't add user, Group reaches the max Limit 50 ." });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.addAdminToGroup = addAdminToGroup;
const deleteUserFromAdmins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.groupId;
    const userIdToDelete = req.body._id;
    try {
        const group = yield GroupModel_1.default.findByIdAndUpdate(groupId, { $pull: { admins: userIdToDelete } }, { new: true });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(200).json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.deleteUserFromAdmins = deleteUserFromAdmins;
const leaveUserFromGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.groupId;
    const userIdToRemove = req.body._id;
    try {
        const group = yield GroupModel_1.default.findByIdAndUpdate(groupId, { $pull: { users: userIdToRemove } }, { new: true });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.status(200).json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.leaveUserFromGroup = leaveUserFromGroup;
const backupMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupId = req.params.groupId;
        const messages = yield MessageModel_1.default.find({ recieverId: groupId }).populate('senderId', 'username');
        if (messages.length === 0) {
            return res.status(404).json({ error: 'No messages found for the group' });
        }
        const backupData = messages.map((message) => {
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
        const backupFileName = `backup_group_${groupId}_${Date.now()}.json`;
        fs_1.default.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
        res.status(200).json({ success: true, backupFileName });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.backupMessages = backupMessages;
