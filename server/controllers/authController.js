const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prisma/client');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { assertTextSafe } = require('../utils/contentModeration');
const { normalizeProfile } = require('../utils/mediaUrl');

const signup = async (req, res) => {
  let { email, password, username, displayName } = req.body;
  const role = 'CREATOR';

  try {
    if (!username || !displayName) {
      return res.status(400).json({ message: 'Username and display name are required' });
    }

    const textCheck = assertTextSafe([
      { value: username, label: 'username' },
      { value: displayName, label: 'display name' },
    ]);
    if (!textCheck.safe) {
      return res.status(400).json({ message: textCheck.message });
    }
    
    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: 'Email already registered' });
      } else {
        // Delete unverified user to allow fresh signup
        await prisma.profile.deleteMany({ where: { userId: existingUser.id } });
        await prisma.user.delete({ where: { id: existingUser.id } });
      }
    }

    // Check if username exists
    const existingProfile = await prisma.profile.findUnique({ where: { username }, include: { user: true } });
    if (existingProfile) {
      if (existingProfile.user && existingProfile.user.isVerified) {
        return res.status(400).json({ message: 'Username is already taken' });
      } else if (existingProfile.user && !existingProfile.user.isVerified) {
        // Delete the unverified user holding this username
        await prisma.profile.deleteMany({ where: { userId: existingProfile.userId } });
        await prisma.user.delete({ where: { id: existingProfile.userId } });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`\n========================================`);
    console.log(`🔑 NEW SIGNUP OTP FOR ${email}: ${verificationOtp}`);
    console.log(`========================================\n`);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationToken: verificationOtp,
        verificationTokenExpires,
        role,
        profile: {
          create: {
            username,
            displayName,
          },
        },
      },
      include: { profile: true },
    });

    // Send OTP Verification Email
    await sendVerificationEmail(email, verificationOtp);

    res.status(201).json({ message: 'OTP sent to your email. Please verify to continue.', email });
  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    res.status(500).json({ message: 'Error signing up', error: err.message });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying email' });
  }
};

const verifyEmailOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationToken: otp,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Check expiry if field exists
    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please sign up again.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Email verified successfully!', token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('VERIFY EMAIL OTP ERROR:', err);
    res.status(500).json({ message: 'Error verifying email OTP' });
  }
};

const resendEmailOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`\n========================================`);
    console.log(`🔄 RESEND OTP FOR ${email}: ${otp}`);
    console.log(`========================================\n`);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: otp, verificationTokenExpires: expires },
    });

    await sendVerificationEmail(email, otp);
    res.json({ message: 'New OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

const login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { profile: true },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'ADMIN' && !user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        isVerified: user.isVerified,
        role: user.role,
        profile: normalizeProfile(user.profile) 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpires: expires
      }
    });

    await sendPasswordResetEmail(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken: otp,
        resetTokenExpires: { gt: new Date() }
      }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    res.json({ message: 'OTP verified', success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken: otp,
        resetTokenExpires: { gt: new Date() }
      }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    res.json({ message: 'Password reset successful!' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { profile: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password: _, ...safeUser } = user;
    res.json({ ...safeUser, profile: normalizeProfile(safeUser.profile) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { signup, login, getMe, verifyEmail, verifyEmailOTP, resendEmailOTP, forgotPassword, verifyOTP, resetPassword };
