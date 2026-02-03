import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

export function validate(schema: ZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(Object.assign(new Error(msg), { statusCode: 400 }));
    }

    // overwrite with parsed data
    // Only assign body (writable). req.query and req.params are read-only in Express,
    // so we validate them but don't overwrite. If transformations are needed, they
    // would need to be attached as custom properties on req.
    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }
    // For query/params: validation passed, but we don't overwrite read-only properties.
    // If you need transformed values, access them from result.data.query/params in your controller.

    next();
  };
}
