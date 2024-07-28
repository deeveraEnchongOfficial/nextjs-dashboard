"use server";

import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

const prisma = new PrismaClient();

const InvoiceSchema = z.object({
  id: z.string(),
  customer_id: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customer_id?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// export async function createInvoice(prevState: State, formData: FormData) {
//   // Validate form fields using Zod
//   const validatedFields = CreateInvoice.safeParse({
//     customer_id: formData.get("customer_id"),
//     amount: formData.get("amount"),
//     status: formData.get("status"),
//   });

//   // If form validation fails, return errors early. Otherwise, continue.
//   if (!validatedFields.success) {
//     return {
//       errors: validatedFields.error.flatten().fieldErrors,
//       message: "Missing Fields. Failed to Create Invoice.",
//     };
//   }

//   // Prepare data for insertion into the database
//   const { customer_id, amount, status } = validatedFields.data;
//   const amountInCents = amount * 100;
//   const date = new Date().toISOString().split("T")[0];

//   // Test it out:
//   // console.log();
//   // Insert data into the database
//   try {
//     await sql`
//         INSERT INTO invoices (customer_id, amount, status, date)
//         VALUES (${customer_id}, ${amountInCents}, ${status}, ${date})`;
//   } catch (error) {
//     return {
//       message: "Database Error: Failed to Create Invoice.",
//     };
//   }

//   // Revalidate the cache for the invoices page and redirect the user.
//   revalidatePath("/dashboard/invoices");
//   redirect("/dashboard/invoices");
// }

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customer_id, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  try {
    await prisma.invoice.create({
      data: {
        customer_id,
        amount: amountInCents,
        status,
        date,
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

// Use Zod to update the expected types
const UpdateInvoice = InvoiceSchema.omit({ id: true, date: true });

// ...

// export async function updateInvoice(
//   id: string,
//   prevState: State,
//   formData: FormData
// ){

//   // Validate form fields using Zod
//   const validatedFields = UpdateInvoice.safeParse({
//     customer_id: formData.get('customer_id'),
//     amount: formData.get('amount'),
//     status: formData.get('status'),
//   });

//   // If form validation fails, return errors early. Otherwise, continue.
//   if (!validatedFields.success) {
//     return {
//       errors: validatedFields.error.flatten().fieldErrors,
//       message: 'Missing Fields. Failed to Update Invoice.',
//     };
//   }

//   // Prepare data for insertion into the database
//   const { customer_id, amount, status } = validatedFields.data;
//   const amountInCents = amount * 100;
//   // Insert data into the database
//   try {
//     await sql`
//       UPDATE invoices
//       SET customer_id = ${customer_id}, amount = ${amountInCents}, status = ${status}
//       WHERE id = ${id}
//     `;
//   } catch (error) {
//     return { message: 'Database Error: Failed to Update Invoice.' };
//   }
//   // Revalidate the cache for the invoices page and redirect the user.
//   revalidatePath('/dashboard/invoices');
//   redirect('/dashboard/invoices');
// }

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  // Validate form fields using Zod
  const validatedFields = UpdateInvoice.safeParse({
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customer_id, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  // Update data in the database
  try {
    await prisma.invoice.update({
      where: { id },
      data: {
        customer_id,
        amount: amountInCents,
        status,
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    return { message: "Database Error: Failed to Update Invoice." };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

// export async function deleteInvoice(id: string) {
//   // throw new Error('Failed to Delete Invoice');
//   try {
//     await sql`DELETE FROM invoices WHERE id = ${id}`;
//     revalidatePath('/dashboard/invoices');
//   } catch (error) {
//     return { message: 'Database Error: Failed to Delete Invoice.' };
//   }
// }

export async function deleteInvoice(id: string) {
  try {
    await prisma.invoice.delete({
      where: { id },
    });
    revalidatePath("/dashboard/invoices");
  } catch (error) {
    console.error("Database Error:", error);
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", Object.fromEntries(formData));
  } catch (error) {
    if ((error as Error).message.includes("CredentialsSignin")) {
      return "CredentialSignin";
    }
    throw error;
  }
}
