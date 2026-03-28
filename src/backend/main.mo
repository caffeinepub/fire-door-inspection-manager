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



actor {
  type DoorId = Nat;
  type InspectionId = Nat;
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

    public type Door = {
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
  public type UserProfile = {
    name : Text;
  };

  var nextDoorId = 1;
  var nextInspectionId = 1;

  let doors = Map.empty<DoorId, Door.Door>();
  let inspections = Map.empty<InspectionId, Inspection.Inspection>();
  let doorInspections = Map.empty<DoorId, List.List<InspectionId>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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
    doors.add(doorId, newDoor);
    doorId;
  };

  public shared ({ caller }) func editDoor(doorId : DoorId, door : Door.Door) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to edit doors");
    };
    if (door.company == "") {
      Runtime.trap("Company name cannot be empty");
    };
    switch (doors.get(doorId)) {
      case (null) { Runtime.trap("Door not found"); };
      case (?existingDoor) {
        let updatedDoor : Door.Door = {
          existingDoor with
          company = door.company;
          building = door.building;
          floor = door.floor;
          location = door.location;
          doorMaterial = door.doorMaterial;
          frameMaterial = door.frameMaterial;
          doorType = door.doorType;
          leafConfig = door.leafConfig;
          fireRating = door.fireRating;
          notes = door.notes;
        };
        doors.add(doorId, updatedDoor);
      };
    };
  };

  public shared ({ caller }) func deleteDoor(doorId : DoorId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: You must be logged in to delete doors");
    };
    switch (doors.get(doorId)) {
      case (null) { Runtime.trap("Door not found"); };
      case (?existingDoor) {
        let updatedDoor : Door.Door = {
          existingDoor with active = false;
        };
        doors.add(doorId, updatedDoor);
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
    if (not doors.containsKey(inspection.doorId)) {
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

  // Public Query Functions
  public query ({ caller }) func getAllDoors() : async [Door.Door] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view doors");
    };
    doors.values().filter(func(d : Door.Door) : Bool { d.active }).toArray().sort();
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
    switch (doors.get(doorId)) {
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
    doors.size();
  };

  // Public functions for QR code status page (no authentication required)
  public query func getPublicDoor(doorId : DoorId) : async ?Door.Door {
    doors.get(doorId);
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
