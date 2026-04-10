import Common "../types/common";
import T "../types/appointment";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type Appointment = T.Appointment;
  public type AppointmentInput = T.AppointmentInput;
  public type Result<A, B> = Common.Result<A, B>;

  public func create(
    store : Map.Map<Nat, Appointment>,
    nextId : Nat,
    input : AppointmentInput,
  ) : (Nat, Appointment) {
    let record : Appointment = {
      id = nextId;
      customerId = input.customerId;
      customerName = input.customerName;
      date = input.date;
      time = input.time;
      service = input.service;
      status = input.status;
      notes = input.notes;
    };
    store.add(nextId, record);
    (nextId, record);
  };

  public func get(store : Map.Map<Nat, Appointment>, id : Nat) : ?Appointment {
    store.get(id);
  };

  public func update(
    store : Map.Map<Nat, Appointment>,
    id : Nat,
    input : AppointmentInput,
  ) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Appointment not found") };
      case (?existing) {
        store.add(id, { existing with
          customerId = input.customerId;
          customerName = input.customerName;
          date = input.date;
          time = input.time;
          service = input.service;
          status = input.status;
          notes = input.notes;
        });
        #ok(());
      };
    };
  };

  public func delete(store : Map.Map<Nat, Appointment>, id : Nat) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Appointment not found") };
      case (?_) {
        store.remove(id);
        #ok(());
      };
    };
  };

  public func list(store : Map.Map<Nat, Appointment>) : [Appointment] {
    store.values().toArray();
  };
};
