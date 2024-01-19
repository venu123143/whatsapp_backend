import Joi from "joi"

// minor: Joi.array().items(Joi.string().disallow(""))
//       .error(new Error('The "minor" array cannot contain an empty string')),
//     university: Joi.string().required(),
//     major: Joi.string().required(),
//     department: Joi.string().required().allow('', null),
//     graduation_date: Joi.string()
//       .regex(/^[0-9]{4}$/)
//       .required()
//       .allow('', null),

export const signUpSchema = Joi.object({
  mobile: Joi.string().trim().required().pattern(/^[6-9]\d{9}$/),
});

export const loginSchema = Joi.object({
  mobile: Joi.string().trim().required().pattern(/^[6-9]\d{9}$/),
  otp: Joi.array()
    .items(Joi.number().integer().min(0).max(9))
    .length(6)
    .required(),
});
