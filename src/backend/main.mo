import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import BlobStorageMixin "blob-storage/Mixin";



actor {
  type DoorId = Nat;
  type InspectionId = Nat;
  type AttachmentId = Nat;

  module Door {
    public type DoorMaterial = {
      #timber;
      #aluminium;
      #steel;
      #hybrid;
    };

    public type FrameMaterial = {
      #timber;
      #metal;
      #uPVC;
      #hybrid;
    };

    public type DoorType = {
      #single;
      #double;
      #sliding;
      #hinged;
    };

    public type LeafConfig = {
      #singleLeaf;
      #doubleLeaf;
      #astragalBar;
    };

    public type FireRating = {
      #thirtyMinutes;
      #sixtyMinutes;
      #ninetyMinutes;
      #oneHundredTwentyMinutes;
    };

    // Current door type (with dimensions)
    public type Door = {
      id : DoorId;
      company : Text;
      building : Text;
      floor : Text;
      location : Text;
      dimensions : Text;
      doorMaterial : DoorMaterial;
      frameMaterial : FrameMaterial;
      doorType : DoorType;
      leafConfig : LeafConfig;
      fireRating : FireRating;
      notes : Text;
      createdAt : Time.Time;
      active : Bool;
    };

    // Legacy door type (without dimensions) — used for migration
    public type LegacyDoor = {
      id : DoorId;
      company : Text;
      building : Text;
      floor : Text;
      location : Text;
      doorMaterial : DoorMaterial;
      frameMaterial : FrameMaterial;
      doorType : DoorType;
      leafConfig : LeafConfig;
      fireRating : FireRating;
      notes : Text;
      createdAt : Time.Time;
      active : Bool;
    };

    public func compare(a : Door, b : Door) : Order.Order {
      Int.compare(a.id, b.id);
    };
  };

  module Inspection {
    public type Checklist = {
      doorCloser : Bool;
      intumescentStrip : Bool;
      selfClosing : Bool;
      signage : Bool;
      visionPanel : Bool;
      hinges : Bool;
      frame : Bool;
      threshold : Bool;
      seals : Bool;
      latch : Bool;
      certificatePlate : Bool;
      noObstructions : Bool;
      doorLeaf : Bool;
      glazing : Bool;
    };

    public type InspectionStatus = {
      #pass;
      #fail;
      #actionRequired;
    };
    public type Inspection = {
      id : InspectionId;
      doorId : DoorId;
      company : Text;
      inspectorName : Text;
      inspectionDate : Time.Time;
      overallStatus : InspectionStatus;
      notes : Text;
      checklist : Checklist;
      createdAt : Time.Time;
    };
  };

  public type DoorAttachment = {
    id : AttachmentId;
    doorId : DoorId;
    filename : Text;
    blobHash : Text;
    uploadedAt : Time.Time;
  };

  public type UserProfile = {
    name : Text;
  };

  var nextDoorId = 1;
  var nextInspectionId = 1;
  var nextAttachmentId = 1;

  // Legacy stable variable — receives the old on-chain 'doors' data (no dimensions field).
  // Must keep this name so Motoko maps the existing state into it on upgrade.
  let doors = Map.empty<DoorId, Door.LegacyDoor>();

  // New stable variable — holds Door records with the dimensions field.
  let doorsV2 = Map.empty<DoorId, Door.Door>();

  let inspections = Map.empty<InspectionId, Inspection.Inspection>();
  let doorInspections = Map.empty<DoorId, List.List<InspectionId>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Attachment storage
  let doorAttachmentMap = Map.empty<DoorId, List.List<DoorAttachment>>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include BlobStorageMixin();

  // Migration: runs once after upgrade to copy legacy doors into doorsV2.
  system func postupgrade() {
    if (doorsV2.size() == 0) {
      for (legacyDoor in doors.values()) {
        let newDoor : Door.Door = {
          id = legacyDoor.id;
          company = legacyDoor.company;
          building = legacyDoor.building;
          floor = legacyDoor.floor;
          location = legacyDoor.location;
          dimensions = "";
          doorMaterial = legacyDoor.doorMaterial;
          frameMaterial = legacyDoor.frameMaterial;
          doorType = legacyDoor.doorType;
          leafConfig = legacyDoor.leafConfig;
          fireRating = legacyDoor.fireRating;
          notes = legacyDoor.notes;
          createdAt = legacyDoor.createdAt;
          active = legacyDoor.active;
        };
        doorsV2.add(newDoor.id, newDoor);
      };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Door Management (any authenticated user)
  public shared ({ caller }) func addDoor(door : Door.Door) : async DoorId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to add doors");
    };
    if (door.company == "") {
      Runtime.trap("Company name cannot be empty");
    };
    let doorId = nextDoorId;
    nextDoorId += 1;
    let newDoor : Door.Door = {
      door with
      id = doorId;
      createdAt = Time.now();
      active = true;
    };
    doorsV2.add(doorId, newDoor);
    doorId;
  };

  public shared ({ caller }) func editDoor(doorId : DoorId, door : Door.Door) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to edit doors");
    };
    if (door.company == "") {
      Runtime.trap("Company name cannot be empty");
    };
    switch (doorsV2.get(doorId)) {
      case (null) { Runtime.trap("Door not found"); };
      case (?existingDoor) {
        let updatedDoor : Door.Door = {
          existingDoor with
          company = door.company;
          building = door.building;
          floor = door.floor;
          location = door.location;
          dimensions = door.dimensions;
          doorMaterial = door.doorMaterial;
          frameMaterial = door.frameMaterial;
          doorType = door.doorType;
          leafConfig = door.leafConfig;
          fireRating = door.fireRating;
          notes = door.notes;
        };
        doorsV2.add(doorId, updatedDoor);
      };
    };
  };

  public shared ({ caller }) func deleteDoor(doorId : DoorId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to delete doors");
    };
    switch (doorsV2.get(doorId)) {
      case (null) { Runtime.trap("Door not found"); };
      case (?existingDoor) {
        let updatedDoor : Door.Door = {
          existingDoor with active = false;
        };
        doorsV2.add(doorId, updatedDoor);
      };
    };
  };

  // Inspection Management (Authenticated users)
  public shared ({ caller }) func addInspection(inspection : Inspection.Inspection) : async InspectionId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit inspections");
    };
    if (inspection.inspectorName == "") {
      Runtime.trap("Inspector name cannot be empty");
    };
    if (inspection.company == "") {
      Runtime.trap("Company name cannot be empty");
    };
    if (not doorsV2.containsKey(inspection.doorId)) {
      Runtime.trap("Door not found");
    };
    let inspectionId = nextInspectionId;
    nextInspectionId += 1;
    let newInspection : Inspection.Inspection = {
      inspection with
      id = inspectionId;
      createdAt = Time.now();
    };
    inspections.add(inspectionId, newInspection);
    let currentInspections = switch (doorInspections.get(inspection.doorId)) {
      case (null) { List.empty<InspectionId>() };
      case (?existingList) { existingList };
    };
    currentInspections.add(inspectionId);
    doorInspections.add(inspection.doorId, currentInspections);
    inspectionId;
  };

  // Attachment Management (Authenticated users)
  public shared ({ caller }) func addDoorAttachment(doorId : DoorId, filename : Text, blobHash : Text) : async AttachmentId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to add attachments");
    };
    if (not doorsV2.containsKey(doorId)) {
      Runtime.trap("Door not found");
    };
    let attachmentId = nextAttachmentId;
    nextAttachmentId += 1;
    let attachment : DoorAttachment = {
      id = attachmentId;
      doorId = doorId;
      filename = filename;
      blobHash = blobHash;
      uploadedAt = Time.now();
    };
    let currentAttachments = switch (doorAttachmentMap.get(doorId)) {
      case (null) { List.empty<DoorAttachment>() };
      case (?existingList) { existingList };
    };
    currentAttachments.add(attachment);
    doorAttachmentMap.add(doorId, currentAttachments);
    attachmentId;
  };

  public query ({ caller }) func getDoorAttachments(doorId : DoorId) : async [DoorAttachment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view attachments");
    };
    let attachmentList = switch (doorAttachmentMap.get(doorId)) {
      case (null) { List.empty<DoorAttachment>() };
      case (?list) { list };
    };
    attachmentList.toArray();
  };

  public shared ({ caller }) func removeDoorAttachment(doorId : DoorId, attachmentId : AttachmentId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to remove attachments");
    };
    let currentAttachments = switch (doorAttachmentMap.get(doorId)) {
      case (null) { return };
      case (?list) { list };
    };
    let filtered = currentAttachments.filter(func(a : DoorAttachment) : Bool {
      a.id != attachmentId
    });
    doorAttachmentMap.add(doorId, filtered);
  };

  // Public Query Functions
  public query ({ caller }) func getAllDoors() : async [Door.Door] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view doors");
    };
    doorsV2.values().filter(func(d : Door.Door) : Bool { d.active }).toArray().sort();
  };

  public query ({ caller }) func getInspectionsForDoor(doorId : DoorId) : async [Inspection.Inspection] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inspections");
    };
    let inspectionIds = switch (doorInspections.get(doorId)) {
      case (null) { List.empty<InspectionId>() };
      case (?list) { list };
    };
    inspectionIds.map<InspectionId, ?Inspection.Inspection>(func(id) { inspections.get(id) }).filterMap<?Inspection.Inspection, Inspection.Inspection>(func(opt) { opt }).toArray();
  };

  public query ({ caller }) func getAllInspections() : async [Inspection.Inspection] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inspections");
    };
    inspections.values().toArray();
  };

  public query ({ caller }) func getDoor(doorId : DoorId) : async Door.Door {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view doors");
    };
    switch (doorsV2.get(doorId)) {
      case (null) { Runtime.trap("Door not found") };
      case (?door) { door };
    };
  };

  public query ({ caller }) func getInspection(inspectionId : InspectionId) : async Inspection.Inspection {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inspections");
    };
    switch (inspections.get(inspectionId)) {
      case (null) { Runtime.trap("Inspection not found") };
      case (?inspection) { inspection };
    };
  };

  public query ({ caller }) func getDoorCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view door count");
    };
    doorsV2.size();
  };

  // Public functions for QR code status page (no authentication required)
  public query func getPublicDoor(doorId : DoorId) : async ?Door.Door {
    doorsV2.get(doorId);
  };

  public query func getPublicInspectionsForDoor(doorId : DoorId) : async [Inspection.Inspection] {
    let inspectionIds = switch (doorInspections.get(doorId)) {
      case (null) { List.empty<InspectionId>() };
      case (?list) { list };
    };
    inspectionIds.map<InspectionId, ?Inspection.Inspection>(func(id) { inspections.get(id) }).filterMap<?Inspection.Inspection, Inspection.Inspection>(func(opt) { opt }).toArray();
  };

  public type Door = Door.Door;
  public type Inspection = Inspection.Inspection;
};
