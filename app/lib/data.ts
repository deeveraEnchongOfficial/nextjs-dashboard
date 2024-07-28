import { sql } from "@vercel/postgres";
import { PrismaClient } from "@prisma/client";
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import { unstable_noStore as noStore } from "next/cache";

const prisma = new PrismaClient();

export async function fetchRevenue() {
  // Prevent the response from being cached
  noStore();
  try {
    // Artificially delay a response for demo purposes
    // Don't do this in real life :)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const revenueData = await prisma.revenue.findMany();

    return revenueData;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        amount: true,
        id: true,
        customer: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    const latestInvoices = invoices.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
      name: invoice.customer.name,
      image_url: invoice.customer.image_url,
      email: invoice.customer.email,
    }));

    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    const invoiceCountPromise = prisma.invoice.count();
    const customerCountPromise = prisma.customer.count();
    const invoiceStatusPromise = prisma.invoice.groupBy({
      by: ["status"],
      _sum: {
        amount: true,
      },
    });

    const [numberOfInvoices, numberOfCustomers, invoiceStatuses] =
      await Promise.all([
        invoiceCountPromise,
        customerCountPromise,
        invoiceStatusPromise,
      ]);

    const totalPaidInvoices = formatCurrency(
      invoiceStatuses.find((status) => status.status === "paid")?._sum.amount ??
        0
    );
    const totalPendingInvoices = formatCurrency(
      invoiceStatuses.find((status) => status.status === "pending")?._sum
        .amount ?? 0
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  // Prevent the response from being cached
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { customer: { name: { contains: query, mode: "insensitive" } } },
          { customer: { email: { contains: query, mode: "insensitive" } } },
          {
            amount: {
              equals: isNaN(Number(query)) ? undefined : Number(query),
            },
          },
          { date: { equals: query } },
          { status: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        customer: true,
      },
      orderBy: {
        date: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      date: invoice.date,
      status: invoice.status,
      name: invoice.customer.name,
      email: invoice.customer.email,
      image_url: invoice.customer.image_url,
    }));
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  // Prevent the response from being cached
  noStore();
  try {
    const searchQuery = `%${query}%`;

    const count = await prisma.invoice.count({
      where: {
        OR: [
          { customer: { name: { contains: query, mode: "insensitive" } } },
          { customer: { email: { contains: query, mode: "insensitive" } } },
          {
            amount: {
              equals: isNaN(Number(query)) ? undefined : Number(query),
            },
          },
          { date: { equals: query } },
          { status: { contains: query, mode: "insensitive" } },
        ],
      },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        customer_id: true,
        amount: true,
        status: true,
      },
    });

    if (invoice) {
      // Convert amount from cents to dollars
      return {
        ...invoice,
        amount: invoice.amount / 100,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice by ID.");
  }
}

export async function fetchCustomers() {
  noStore();
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  // Prevent the response from being cached
  noStore();

  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image_url: true,
        _count: {
          select: { invoices: true },
        },
        invoices: {
          select: {
            status: true,
            amount: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedCustomers = customers.map((customer) => {
      const total_pending = customer.invoices
        .filter((invoice) => invoice.status === "pending")
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      const total_paid = customer.invoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
        total_invoices: customer._count.invoices,
        total_pending: formatCurrency(total_pending),
        total_paid: formatCurrency(total_paid),
      };
    });

    return formattedCustomers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

export async function getUser(email: string) {
  noStore();
  try {
    const user = await sql`SELECT * from USERS where email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}
