import SharedEnrollUsers from "@/pages/course/admin/EnrollUsersBulk";

export default function SchoolOwnerEnrollUsers() {
  return (
    <SharedEnrollUsers
      apiPrefix="/school-owner"
      backRoute="/school-owner/courses"
      backLabel="Back To School Admin Courses"
    />
  );
}
