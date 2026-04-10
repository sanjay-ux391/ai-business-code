import Common "../types/common";
import T "../types/feedback";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type Feedback = T.Feedback;
  public type FeedbackInput = T.FeedbackInput;
  public type Result<A, B> = Common.Result<A, B>;

  public func create(
    store : Map.Map<Nat, Feedback>,
    nextId : Nat,
    input : FeedbackInput,
  ) : (Nat, Feedback) {
    let record : Feedback = {
      id = nextId;
      customerId = input.customerId;
      customerName = input.customerName;
      text = input.text;
      sentiment = input.sentiment;
      rating = input.rating;
      createdAt = input.createdAt;
      category = input.category;
    };
    store.add(nextId, record);
    (nextId, record);
  };

  public func get(store : Map.Map<Nat, Feedback>, id : Nat) : ?Feedback {
    store.get(id);
  };

  public func update(
    store : Map.Map<Nat, Feedback>,
    id : Nat,
    input : FeedbackInput,
  ) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Feedback not found") };
      case (?existing) {
        store.add(id, { existing with
          customerId = input.customerId;
          customerName = input.customerName;
          text = input.text;
          sentiment = input.sentiment;
          rating = input.rating;
          createdAt = input.createdAt;
          category = input.category;
        });
        #ok(());
      };
    };
  };

  public func delete(store : Map.Map<Nat, Feedback>, id : Nat) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Feedback not found") };
      case (?_) {
        store.remove(id);
        #ok(());
      };
    };
  };

  public func list(store : Map.Map<Nat, Feedback>) : [Feedback] {
    store.values().toArray();
  };
};
