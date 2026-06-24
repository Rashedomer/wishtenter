#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = require('../prisma/client');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

async function createAdmin() {
  try {
    console.log('\n🔐 Admin Account Creation\n');
    
    // Get input from user
    const email = await question('Admin Email: ');
    const password = await question('Admin Password: ');
    const username = await question('Admin Username (default: admin): ') || 'admin';
    const displayName = await question('Display Name (default: System Admin): ') || 'System Admin';

    // Validate inputs
    if (!email || !password) {
      console.error('❌ Email and password are required!');
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({ where: { email } });
    if (existingAdmin) {
      if (existingAdmin.role === 'ADMIN') {
        console.log('⚠️  Admin with this email already exists!');
        process.exit(1);
      } else {
        // Update existing user to admin
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: { 
            password: hashedPassword,
            role: 'ADMIN',
            isVerified: true
          }
        });
        console.log('✅ User promoted to ADMIN successfully!');
      }
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          isVerified: true,
          profile: {
            create: {
              username,
              displayName,
            }
          }
        },
      });
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Details:');
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   👤 Username: ${username}`);
    console.log(`   📝 Display Name: ${displayName}\n`);
    
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
