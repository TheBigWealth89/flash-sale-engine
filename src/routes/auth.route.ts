import { Router } from 'express';
import { AuthController } from '../presentation/controllers/AuthController.js';

const authController = new AuthController();
const authRoute = Router();

authRoute.get('/login', authController.getLoginPage.bind(authController));
authRoute.post('/login', authController.login.bind(authController));
authRoute.get('/logout', authController.logout.bind(authController));

export default authRoute;
