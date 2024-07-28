import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  invoices,
  customers,
  revenue,
  users,
} from '../app/lib/placeholder-data.js';

const prisma = new PrismaClient();

async function seedUsers() {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: hashedPassword,
      },
    });
  }
  console.log(`Seeded ${users.length} users`);
}

async function seedCustomers() {
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
      },
    });
  }
  console.log(`Seeded ${customers.length} customers`);
}

async function seedInvoices() {
  for (const invoice of invoices) {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {},
      create: {
        // id: invoice.id,
        customer_id: invoice.customer_id,
        amount: invoice.amount,
        status: invoice.status,
        date: invoice.date,
      },
    });
  }
  console.log(`Seeded ${invoices.length} invoices`);
}

async function seedRevenue() {
  for (const rev of revenue) {
    await prisma.revenue.upsert({
      where: { month: rev.month },
      update: {},
      create: {
        month: rev.month,
        revenue: rev.revenue,
      },
    });
  }
  console.log(`Seeded ${revenue.length} revenue`);
}

async function main() {
  try {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
  } catch (error) {
    console.error('An error occurred while attempting to seed the database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
