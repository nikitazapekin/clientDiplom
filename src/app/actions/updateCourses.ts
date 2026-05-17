"use server";

import { revalidatePath } from "next/cache";

export async function updateCourses() {
  revalidatePath("/admin/courses");
}
