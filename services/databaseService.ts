import { ref, get, child } from "firebase/database";
import { database } from "./firebaseConfig";
import { Announcement, Subject, CommunityPost } from "../types";
import { ANNOUNCEMENTS, SUBJECTS, MOCK_TOPICS, MOCK_SUBTOPICS } from "../constants";

// This service attempts to fetch from Firebase, falling back to constants if empty/offline
export const DatabaseService = {
  getAnnouncements: async (): Promise<Announcement[]> => {
    try {
      const snapshot = await get(child(ref(database), 'announcements'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Array.isArray(data) ? data : Object.values(data);
      }
    } catch (error) {
      console.warn("Failed to fetch announcements, using fallback.", error);
    }
    return ANNOUNCEMENTS;
  },

  getSubjects: async (): Promise<Subject[]> => {
    try {
      const snapshot = await get(child(ref(database), 'subjects'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Array.isArray(data) ? data : Object.values(data);
      }
    } catch (error) {
      console.warn("Failed to fetch subjects, using fallback.", error);
    }
    return SUBJECTS;
  },

  getTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'topics'));
      if (snapshot.exists()) {
        return snapshot.val();
      }
    } catch (error) {
      console.warn("Failed to fetch topics, using fallback.", error);
    }
    return MOCK_TOPICS;
  },

  getSubTopics: async (): Promise<Record<string, string[]>> => {
    try {
      const snapshot = await get(child(ref(database), 'subtopics'));
      if (snapshot.exists()) {
        return snapshot.val();
      }
    } catch (error) {
      console.warn("Failed to fetch subtopics, using fallback.", error);
    }
    return MOCK_SUBTOPICS;
  }
};