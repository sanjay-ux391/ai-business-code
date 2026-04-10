import Common "../types/common";
import T "../types/feedback";
import FeedbackLib "../lib/feedback";
import Map "mo:core/Map";

mixin (feedbacks : Map.Map<Nat, T.Feedback>) {
  var nextFeedbackId : Nat = 0;

  func getNextFeedbackId() : Nat {
    if (nextFeedbackId == 0) {
      var maxId : Nat = 0;
      for ((k, _) in feedbacks.entries()) {
        if (k > maxId) { maxId := k };
      };
      nextFeedbackId := maxId + 1;
    };
    let id = nextFeedbackId;
    nextFeedbackId += 1;
    id;
  };

  public func createFeedback(input : T.FeedbackInput) : async Common.Result<Nat, Text> {
    let id = getNextFeedbackId();
    let (newId, _) = FeedbackLib.create(feedbacks, id, input);
    #ok(newId);
  };

  public query func getFeedback(id : Nat) : async ?T.Feedback {
    FeedbackLib.get(feedbacks, id);
  };

  public func updateFeedback(id : Nat, input : T.FeedbackInput) : async Common.Result<(), Text> {
    FeedbackLib.update(feedbacks, id, input);
  };

  public func deleteFeedback(id : Nat) : async Common.Result<(), Text> {
    FeedbackLib.delete(feedbacks, id);
  };

  public query func listFeedbacks() : async [T.Feedback] {
    FeedbackLib.list(feedbacks);
  };
};
