import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@rohan-stha/medium-common";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("authorization");
  try {
    if (!header) return c.json({ error: "Unauthorized" }, 403);
    const response = await verify(header, c.env.JWT_SECRET);

    if (response) {
      c.set("userId", response.id);

      await next();
    } else {
      return c.json({ error: "Unauthorized" }, 403);
    }
  } catch (e) {
    return c.json({ error: "Unauthorized" }, 403);
  }
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();

  const { success } = createBlogInput.safeParse(body);
  if (!success) c.json({ msg: "missing input " }, 411);
  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId,
    },
  });

  return c.json({ id: blog.id }, 201);
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.findUnique({
    where: { id },
  });
  return c.json(blog, 200);
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if (!success) c.json({ msg: "missing input " }, 411);
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.update({
    where: { id: body.id },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({ msg: "blog edited" }, 200);
});

blogRouter.get("/", async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = await prisma.blog.findMany({
      where: { id: body.id },
    });
    return c.json(blog, 200);
  } catch (e) {
    console.log(e);
    return c.json({ error: "Invalid" }, 403);
  }
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blogs = await prisma.blog.findMany();
    return c.json(blogs, 200);
  } catch (e) {
    console.log(e);
    return c.json({ msg: "Invalid" });
  }
});
