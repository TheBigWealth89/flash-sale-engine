import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export class AuthController {
  
  getLoginPage(req: Request, res: Response) {
    res.render('login', { error: null });
  }

  login(req: Request, res: Response) {
    const { username, password } = req.body;
    
    let user = null;
    // TODO: replace with database user lookup when real auth is implemented
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASS) {
      user = { id: 'admin-1', role: 'admin' };
    } else if (username === process.env.CUSTOMER_USERNAME && password === process.env.CUSTOMER_PASS) {
      user = { id: 'user-alice', role: 'customer' };
    }

    if (user) {
      const payload = { sub: user.id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '24h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400000,
      });

      if (user.role === 'admin') {
        res.redirect('/admin/dashboard');
      } else {
        res.redirect('/product/1');
      }
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  }

  logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.redirect('/login');
  }
}
