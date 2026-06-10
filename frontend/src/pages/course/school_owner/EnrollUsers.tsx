import SharedEnrollUsers from "@/pages/course/admin/EnrollUsers";

export default function SchoolOwnerEnrollUsers() {
  return (
    <SharedEnrollUsers
      apiPrefix="/school-owner"
      backRoute="/school-owner/courses"
      backLabel="Back To School Admin Courses"
    />
  );
}
