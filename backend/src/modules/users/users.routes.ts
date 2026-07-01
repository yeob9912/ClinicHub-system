import { Router } from 'express';
import { usersController } from './users.controller';
import { validate } from '../../middleware/validate';
import { avatarUpload } from '../../middleware/upload';
import { UpdateProfileSchema } from './users.schemas';

const router = Router();

// GET /users/me
router.get('/me', usersController.getMe);

// PUT /users/me
router.put('/me', validate(UpdateProfileSchema), usersController.updateMe);

// POST /users/me/avatar
router.post('/me/avatar', avatarUpload.single('avatar'), usersController.uploadAvatar);

// DELETE /users/me
router.delete('/me', usersController.deleteMe);

// POST /users/me/favorites
router.post('/me/favorites', usersController.toggleFavorite);

export { router as usersRouter };
