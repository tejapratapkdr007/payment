import { TokenPayload } from "../types";

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export {};
