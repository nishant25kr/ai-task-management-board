import type { Request, Response } from 'express';
import { prisma } from "@repo/db";
import { createOrgSchema, deleteOrgSchema, type AuthenticatedRequest } from '../types';

const getOrg = async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const memberships = await prisma.membership.findMany({
            where: { userId },
            select: {
                role: true,
                organisationId: true,
            },
        });

        const admin = await prisma.organization.findMany({
            where: {
                id: {
                    in: memberships
                        .filter((m) => m.role === "ADMIN")
                        .map((m) => m.organisationId)
                }
            }
        })
        const member = await prisma.organization.findMany({
            where: {
                id: {
                    in: memberships
                        .filter((m) => m.role === "MEMBER")
                        .map((m) => m.organisationId)
                }
            }
        })

        return res.status(200).json({ admin, member });
    } catch (error) {
        console.error("getOrg failed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const createOrg = async (req: Request, res: Response) => {
    const parsedData = createOrgSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(404).json({ message: "Validation failed" })
    }
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.user?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const org = await prisma.organization.create({
            data: {
                name: parsedData.data.name,
                description: parsedData.data.description
            }
        })

        if (!org) return res.status(400).json({ message: "failed to create organization" });

        const userId = authReq.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const membership = await prisma.membership.create({
            data: {
                userId,
                organisationId: org.id,
                role: 'ADMIN',
            }
        })

        if (!org || !membership) return res.status(400).json({ message: "failed to create organization" });

        return res.status(200).json({ message: "organization created successfully", data: org });
    } catch (error: any) {
        return res.status(500).json({ message: "failed to create organization", error: error.message });
    }
}

const deleteOrg = async (req: Request, res: Response) => {
    console.log(req.params);
    const parsedData = deleteOrgSchema.safeParse(req.params);

    if (!parsedData.success) {
        return res.status(400).json({ message: "Validation failed" });
    }

    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const org = await prisma.organization.findUnique({
            where: {
                id: parsedData.data.id,
            },
        });

        if (!org) {
            return res.status(404).json({ message: "Organization not found" });
        }

        const membership = await prisma.membership.findFirst({
            where: {
                organisationId: parsedData.data.id,
                userId,
                role: "ADMIN",
            },
        });

        if (!membership) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await prisma.membership.delete({
            where:{
                id: membership?.id
            }
        })
        
        await prisma.organization.delete({
            where: {
                id: parsedData.data.id,
            },
        });
        
        return res.status(200).json({ message: "Organization deleted successfully" });
    } catch (error) {
        console.error("deleteOrg failed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export { getOrg, createOrg, deleteOrg }