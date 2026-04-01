import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Inspection {
    id: InspectionId;
    inspectionDate: Time;
    doorId: DoorId;
    inspectorName: string;
    createdAt: Time;
    company: string;
    notes: string;
    checklist: Checklist;
    overallStatus: InspectionStatus;
}
export type DoorId = bigint;
export type InspectionId = bigint;
export type AttachmentId = bigint;
export interface Door {
    id: DoorId;
    floor: string;
    active: boolean;
    createdAt: Time;
    building: string;
    company: string;
    dimensions: string;
    leafConfig: LeafConfig;
    doorType: DoorType;
    notes: string;
    doorMaterial: DoorMaterial;
    frameMaterial: FrameMaterial;
    location: string;
    fireRating: FireRating;
}
export interface DoorAttachment {
    id: AttachmentId;
    doorId: DoorId;
    filename: string;
    blobHash: string;
    uploadedAt: Time;
}
export interface Checklist {
    frame: boolean;
    glazing: boolean;
    certificatePlate: boolean;
    doorCloser: boolean;
    threshold: boolean;
    signage: boolean;
    hinges: boolean;
    latch: boolean;
    seals: boolean;
    intumescentStrip: boolean;
    doorLeaf: boolean;
    noObstructions: boolean;
    selfClosing: boolean;
    visionPanel: boolean;
}
export interface UserProfile {
    name: string;
}
export interface UserApprovalInfo {
    principal: Principal;
    status: ApprovalStatus;
}
export interface StripeConfiguration {
    secretKey: string;
    allowedCountries: string[];
}
export interface ShoppingItem {
    currency: string;
    productName: string;
    productDescription: string;
    priceInCents: bigint;
    quantity: bigint;
}
export enum DoorMaterial {
    timber = "timber",
    aluminium = "aluminium",
    hybrid = "hybrid",
    steel = "steel"
}
export enum DoorType {
    double_ = "double",
    hinged = "hinged",
    sliding = "sliding",
    single = "single"
}
export enum FireRating {
    sixtyMinutes = "sixtyMinutes",
    thirtyMinutes = "thirtyMinutes",
    oneHundredTwentyMinutes = "oneHundredTwentyMinutes",
    ninetyMinutes = "ninetyMinutes"
}
export enum FrameMaterial {
    metal = "metal",
    timber = "timber",
    uPVC = "uPVC",
    hybrid = "hybrid"
}
export enum InspectionStatus {
    fail = "fail",
    pass = "pass",
    actionRequired = "actionRequired"
}
export enum LeafConfig {
    doubleLeaf = "doubleLeaf",
    astragalBar = "astragalBar",
    singleLeaf = "singleLeaf"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum ApprovalStatus {
    approved = "approved",
    rejected = "rejected",
    pending = "pending"
}
export interface backendInterface {
    addDoor(door: Door): Promise<DoorId>;
    addInspection(inspection: Inspection): Promise<InspectionId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteDoor(doorId: DoorId): Promise<void>;
    editDoor(doorId: DoorId, door: Door): Promise<void>;
    getAllDoors(): Promise<Array<Door>>;
    getAllInspections(): Promise<Array<Inspection>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDoor(doorId: DoorId): Promise<Door>;
    getDoorCount(): Promise<bigint>;
    getInspection(inspectionId: InspectionId): Promise<Inspection>;
    getInspectionsForDoor(doorId: DoorId): Promise<Array<Inspection>>;
    getPublicDoor(doorId: DoorId): Promise<Door | null>;
    getPublicInspectionsForDoor(doorId: DoorId): Promise<Array<Inspection>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    addDoorAttachment(doorId: DoorId, filename: string, blobHash: string): Promise<AttachmentId>;
    getDoorAttachments(doorId: DoorId): Promise<Array<DoorAttachment>>;
    removeDoorAttachment(doorId: DoorId, attachmentId: AttachmentId): Promise<void>;
    _caffeineStorageCreateCertificate(hash: string): Promise<Uint8Array>;
    isCallerApproved(): Promise<boolean>;
    requestApproval(): Promise<void>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    isStripeConfigured(): Promise<boolean>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
}
