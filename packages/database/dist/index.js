"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prismaSingleton = () => {
    return new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
};
exports.prisma = global.prisma ?? prismaSingleton();
if (process.env.NODE_ENV !== "production") {
    global.prisma = exports.prisma;
}
// Re-export all the types from the generated client.
// This allows other packages to import types like `User`, `Proposal`, etc.,
// directly from this `database` package, creating a shared type contract.
__exportStar(require("@prisma/client"), exports);
// Re-export all the types from the generated client.
// This allows other packages to import types like `User`, `Proposal`, etc.,
// directly from this `database` package.
__exportStar(require("@prisma/client"), exports);
