import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  usedAt?: Date | null;
  revokedAt?: Date | null;
  replacedByHash?: string | null;
  userAgent?: string;
  ip?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * One document per issued refresh token.
 * Only the sha256 hash is stored, so a database leak does not hand out sessions.
 * `family` groups every token rotated out of the same login, which lets us kill
 * the whole chain when an already used token is replayed.
 */
const refreshTokenSchema: Schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    family: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByHash: {
      type: String,
      default: null,
    },
    userAgent: String,
    ip: String,
  },
  { collection: "refresh_tokens", timestamps: true, versionKey: false }
);

// mongo removes the document itself once the 45 day window is over.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);
