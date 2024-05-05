import Joi from "joi"

export const signUpSchema = Joi.object({
  mobile: Joi.string().trim().required().pattern(/^[6-9]\d{9}$/),
});

export const loginSchema = Joi.object({
  otp: Joi.array()
    .items(Joi.number().integer().min(0).max(9))
    .length(6)
    .required(),
});

// Define a Joi schema for the create call request
export const createCallSchema = Joi.object({
  title: Joi.string().trim().messages({
    'string.base': 'Title must be a string.',
  }),
  callType: Joi.string().valid('audio_call', 'video_call').messages({
    'string.base': 'Call type must be a string.',
    'any.only': 'Call type must be either "audio_call" or "video_call".',
  }),
  pin: Joi.string()
    .pattern(/^[0-9]{4}$/)
    .messages({
      'string.base': 'PIN must be a string of 4 digit number.',
      'string.pattern.base': 'PIN must be a 4-digit number.',
    }),
});