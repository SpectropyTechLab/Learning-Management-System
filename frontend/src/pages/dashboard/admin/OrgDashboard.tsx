import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BulkSetup from './BulkSetup';
import spectropyLogo from '/logo.png';
import { RiFileList3Line } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { RiHome2Line } from 'react-icons/ri';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav, { type SidebarNavItem } from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { getRoleDisplayTitle } from '@/features/auth/utils/roleBranding';

type TabKey = 'schools' | 'schoolMembers' | 'courseAssignments' | 'examAssignments' | 'batches' | 'batchMembers' | 'roles' | 'users' | 'bulkSetup';

interface School {
  id: number;
  name: string;
  school_code?: string | null;
  status: string;
  client_id?: number | null;
}

interface Batch {
  id: number;
  name: string;
  school_id: number;
  is_active: boolean;
}

interface RolePermission {
  id: number;
  role: string;
  permission: string;
  granted: boolean;
  client_id: number | null;
}

interface Membership {
  id: number;
  school_id: number;
  user_id: number;
  full_name: string;
  email: string;
  role_scope: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  client_id?: number | null;
}

interface UserPermission {
  id: number;
  user_id: number;
  permission: string;
  granted: boolean;
}

interface AssignableCourse {
  id: number;
  title: string;
  description?: string | null;
  published?: boolean;
  client_id?: number | null;
  is_entitled_platform_course?: boolean;
}

interface SchoolCourseAssignment {
  id: number;
  school_id: number;
  course_id: number;
  title: string;
  description?: string | null;
  published?: boolean;
  assigned_at?: string;
}

interface AssignableExam {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  client_id?: number | null;
  program_id?: number | null;
  exam_access_type?: string | null;
}

interface AssignableQuestionBankProgram {
  id: number;
  name: string;
  code?: string | null;
  client_id?: number | null;
  school_id?: number | null;
  is_active?: boolean;
}

interface SchoolExamAssignment {
  id: number;
  school_id: number;
  exam_id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  client_id?: number | null;
  program_id?: number | null;
  assigned_at?: string;
}

interface SchoolQuestionBankAssignment {
  id: number;
  school_id: number;
  program_id: number;
  name: string;
  code?: string | null;
  client_id?: number | null;
  program_school_id?: number | null;
  is_active?: boolean;
  assigned_at?: string;
}

type ClientUser = {
  logo?: string;
  client_name?: string;
};

const permissionGroupLabels: Record<string, string> = {
  questions: 'Question Bank',
  exams: 'Exams',
  courses: 'Courses',
  subjects: 'Subjects',
  chapters: 'Chapters',
  topics: 'Topics',
};

const permissionGroupOrder = ['Question Bank', 'Exams', 'Courses', 'Subjects', 'Chapters', 'Topics', 'Other'];

const getPermissionGroup = (permission: string) => {
  const prefix = permission.split('.')[0];
  return permissionGroupLabels[prefix] ?? 'Other';
};

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [schoolMembers, setSchoolMembers] = useState<Membership[]>([]);
  const [batchMembers, setBatchMembers] = useState<Membership[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [saving, setSaving] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'granted' | 'missing'>('all');
  const [selectedOverrideSchoolId, setSelectedOverrideSchoolId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userOverrides, setUserOverrides] = useState<UserPermission[]>([]);
  const [overrideSchoolMembers, setOverrideSchoolMembers] = useState<Membership[]>([]);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedAssignmentSchoolId, setSelectedAssignmentSchoolId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [clientCourses, setClientCourses] = useState<AssignableCourse[]>([]);
  const [schoolCourseAssignments, setSchoolCourseAssignments] = useState<SchoolCourseAssignment[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [loadingCourseAssignments, setLoadingCourseAssignments] = useState(false);
  const [clientExams, setClientExams] = useState<AssignableExam[]>([]);
  const [schoolExamAssignments, setSchoolExamAssignments] = useState<SchoolExamAssignment[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [loadingExamAssignments, setLoadingExamAssignments] = useState(false);
  const [clientQuestionBankPrograms, setClientQuestionBankPrograms] = useState<AssignableQuestionBankProgram[]>([]);
  const [schoolQuestionBankAssignments, setSchoolQuestionBankAssignments] = useState<SchoolQuestionBankAssignment[]>([]);
  const [selectedQuestionBankProgramIds, setSelectedQuestionBankProgramIds] = useState<string[]>([]);
  const [loadingQuestionBankAssignments, setLoadingQuestionBankAssignments] = useState(false);

  const [schoolForm, setSchoolForm] = useState({ name: '', school_code: '' });
  const [batchForm, setBatchForm] = useState({ name: '', school_id: '' });
  const [schoolMemberForm, setSchoolMemberForm] = useState({ user_id: '', role_scope: 'teacher', is_primary: false });
  const [batchMemberForm, setBatchMemberForm] = useState({ user_id: '', is_primary: false });
  const [userForm, setUserForm] = useState({ email: '', full_name: '', password: '', role: 'teacher', school_id: '' });

  const loadSchools = async () => {
    const res = await api.get('/org/schools');
    setSchools(res.data);
  };

  const loadBatches = async (schoolId?: string) => {
    const query = schoolId ? `?school_id=${schoolId}` : '';
    const res = await api.get(`/org/batches${query}`);
    setBatches(res.data);
  };

  const loadSchoolMembers = async (schoolId: string) => {
    const res = await api.get(`/org/schools/${schoolId}/memberships`);
    setSchoolMembers(res.data);
  };

  const loadOverrideSchoolMembers = async (schoolId: string) => {
    if (!schoolId) {
      setOverrideSchoolMembers([]);
      return;
    }

    const res = await api.get(`/org/schools/${schoolId}/memberships`);
    setOverrideSchoolMembers(res.data);
  };

  const loadBatchMembers = async (batchId: string) => {
    const res = await api.get(`/org/batches/${batchId}/members`);
    setBatchMembers(res.data);
  };

  const loadRolePermissions = async () => {
    const role = user?.role;
    if (!role || (role !== 'super_admin' && role !== 'client_admin')) return;
    const params = new URLSearchParams();
    params.set('scope', 'client');
    params.set('role', selectedRole);
    const res = await api.get(`/org/role-permissions?${params.toString()}`);
    setRolePermissions(res.data);
  };

  const loadUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const loadClientCourses = async () => {
    const role = user?.role;
    if (!role || (role !== 'super_admin' && role !== 'client_admin')) return;
    const res = await api.get('/admin/courses');
    setClientCourses(res.data);
  };

  const loadClientExams = async () => {
    const role = user?.role;
    if (!role || (role !== 'super_admin' && role !== 'client_admin')) return;
    const res = await api.get('/exams', {
      params: {
        page: 1,
        page_size: 200,
        status: 'published',
      },
    });
    setClientExams(Array.isArray(res.data?.data) ? res.data.data : []);
  };

  const loadClientQuestionBankPrograms = async () => {
    const role = user?.role;
    if (!role || (role !== 'super_admin' && role !== 'client_admin')) return;
    const res = await api.get('/programs');
    setClientQuestionBankPrograms(Array.isArray(res.data) ? res.data : []);
  };

  const loadSchoolCourseAssignments = async (schoolId: string) => {
    if (!schoolId) {
      setSchoolCourseAssignments([]);
      return;
    }

    setLoadingCourseAssignments(true);
    try {
      const res = await api.get(`/org/schools/${schoolId}/course-assignments`);
      setSchoolCourseAssignments(res.data);
    } finally {
      setLoadingCourseAssignments(false);
    }
  };

  const loadSchoolExamAssignments = async (schoolId: string) => {
    if (!schoolId) {
      setSchoolExamAssignments([]);
      return;
    }

    setLoadingExamAssignments(true);
    try {
      const res = await api.get(`/org/schools/${schoolId}/exam-assignments`);
      setSchoolExamAssignments(res.data);
    } finally {
      setLoadingExamAssignments(false);
    }
  };

  const loadSchoolQuestionBankAssignments = async (schoolId: string) => {
    if (!schoolId) {
      setSchoolQuestionBankAssignments([]);
      return;
    }

    setLoadingQuestionBankAssignments(true);
    try {
      const res = await api.get(`/org/schools/${schoolId}/question-bank-assignments`);
      setSchoolQuestionBankAssignments(res.data);
    } finally {
      setLoadingQuestionBankAssignments(false);
    }
  };

  const loadUserOverrides = async (userId: string) => {
    if (!userId) {
      setUserOverrides([]);
      return;
    }

    const res = await api.get(`/org/user-permissions?user_id=${userId}`);
    setUserOverrides(res.data);
  };

  useEffect(() => {
    loadSchools();
    loadBatches();
    loadUsers();
    loadClientCourses();
    loadClientExams();
    loadClientQuestionBankPrograms();
  }, [user?.role]);

  useEffect(() => {
    loadRolePermissions();
  }, [user?.role, selectedRole]);

  useEffect(() => {
    loadUserOverrides(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedSchoolId) loadSchoolMembers(selectedSchoolId);
  }, [selectedSchoolId]);

  useEffect(() => {
    loadSchoolCourseAssignments(selectedAssignmentSchoolId);
    loadSchoolExamAssignments(selectedAssignmentSchoolId);
    loadSchoolQuestionBankAssignments(selectedAssignmentSchoolId);
  }, [selectedAssignmentSchoolId]);

  useEffect(() => {
    setSelectedCourseIds([]);
    setSelectedExamIds([]);
    setSelectedQuestionBankProgramIds([]);
  }, [selectedAssignmentSchoolId]);

  useEffect(() => {
    loadOverrideSchoolMembers(selectedOverrideSchoolId);
  }, [selectedOverrideSchoolId]);

  useEffect(() => {
    setSelectedUserId('');
    setUserOverrides([]);
  }, [selectedRole, selectedOverrideSchoolId]);

  useEffect(() => {
    if (selectedBatchId) loadBatchMembers(selectedBatchId);
  }, [selectedBatchId]);

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/org/schools', schoolForm);
    setSchoolForm({ name: '', school_code: '' });
    loadSchools();
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/org/batches', batchForm);
    setBatchForm({ name: '', school_id: '' });
    loadBatches(batchForm.school_id);
  };

  const addSchoolMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    await api.post(`/org/schools/${selectedSchoolId}/memberships`, schoolMemberForm);
    setSchoolMemberForm({ user_id: '', role_scope: 'teacher', is_primary: false });
    loadSchoolMembers(selectedSchoolId);
  };

  const addBatchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    await api.post(`/org/batches/${selectedBatchId}/members`, batchMemberForm);
    setBatchMemberForm({ user_id: '', is_primary: false });
    loadBatchMembers(selectedBatchId);
  };

  const filteredPermissions = useMemo(() => {
    return rolePermissions.filter((perm) => perm.role === selectedRole);
  }, [rolePermissions, selectedRole]);

  const availableSchoolUsers = useMemo(() => {
    const assignedUserIds = new Set(schoolMembers.map((member) => String(member.user_id)));
    return users.filter((candidate) => !assignedUserIds.has(String(candidate.id)));
  }, [users, schoolMembers]);

  const availableBatchUsers = useMemo(() => {
    const assignedUserIds = new Set(batchMembers.map((member) => String(member.user_id)));
    return users.filter((candidate) => !assignedUserIds.has(String(candidate.id)));
  }, [users, batchMembers]);

  const availableOverrideUsers = useMemo(() => {
    const roleFilteredUsers = users.filter((candidate) => candidate.role === selectedRole);

    if (!selectedOverrideSchoolId) {
      return roleFilteredUsers;
    }

    const schoolMemberIds = new Set(
      overrideSchoolMembers
        .filter((member) => member.role_scope === selectedRole)
        .map((member) => String(member.user_id))
    );

    return roleFilteredUsers.filter((candidate) => schoolMemberIds.has(String(candidate.id)));
  }, [
    users,
    selectedRole,
    selectedOverrideSchoolId,
    overrideSchoolMembers,
  ]);

  const selectedAssignmentSchool = useMemo(
    () => schools.find((school) => String(school.id) === selectedAssignmentSchoolId) ?? null,
    [schools, selectedAssignmentSchoolId]
  );

  const availableCoursesForAssignment = useMemo(() => {
    const assignedIds = new Set(schoolCourseAssignments.map((assignment) => assignment.course_id));
    return clientCourses.filter((course) => {
      const isPlatformCourse = course.client_id == null || Number(course.client_id) === 17;
      const courseClientMatches = !selectedAssignmentSchool?.client_id
        || Number(course.client_id) === Number(selectedAssignmentSchool.client_id)
        || isPlatformCourse
        || course.is_entitled_platform_course === true;
      return courseClientMatches && !assignedIds.has(course.id);
    });
  }, [clientCourses, schoolCourseAssignments, selectedAssignmentSchool]);

  const availableExamsForAssignment = useMemo(() => {
    const assignedIds = new Set(schoolExamAssignments.map((assignment) => assignment.exam_id));
    return clientExams.filter((exam) => {
      const isPlatformExam = Number(exam.client_id) === 17 || exam.exam_access_type === 'platform_owned';
      const examClientMatches = !selectedAssignmentSchool?.client_id
        || Number(exam.client_id) === Number(selectedAssignmentSchool.client_id)
        || isPlatformExam;
      return examClientMatches && !assignedIds.has(exam.id);
    });
  }, [clientExams, schoolExamAssignments, selectedAssignmentSchool]);

  const availableQuestionBankProgramsForAssignment = useMemo(() => {
    const assignedIds = new Set(schoolQuestionBankAssignments.map((assignment) => assignment.program_id));
    return clientQuestionBankPrograms.filter((program) => {
      const isPlatformProgram = Number(program.client_id) === 17 && !program.school_id;
      const programClientMatches = !selectedAssignmentSchool?.client_id
        || Number(program.client_id) === Number(selectedAssignmentSchool.client_id)
        || isPlatformProgram;
      const schoolScopedMatches = !program.school_id
        || !selectedAssignmentSchoolId
        || Number(program.school_id) === Number(selectedAssignmentSchoolId);
      return program.is_active !== false && programClientMatches && schoolScopedMatches && !assignedIds.has(program.id);
    });
  }, [clientQuestionBankPrograms, schoolQuestionBankAssignments, selectedAssignmentSchool, selectedAssignmentSchoolId]);

  const userPermissionSet = useMemo(
    () => new Set((user?.permissions ?? []).filter(Boolean)),
    [user?.permissions]
  );
  const hasAnyPermission = (permissions: string[]) =>
    user?.role === 'super_admin' || permissions.some((permission) => userPermissionSet.has(permission));
  const canAssignExams = hasAnyPermission(['exams.assign', 'exams.create', 'exams.update', 'exams.publish']);
  const canAssignQuestionBank = hasAnyPermission(['questions.assign', 'questions.create', 'questions.approve']);

  const permissionMap = useMemo(() => {
    const map = new Map<string, RolePermission>();
    filteredPermissions.forEach((perm) => {
      map.set(perm.permission, perm);
    });
    return map;
  }, [filteredPermissions]);

  const permissionKeys = useMemo(() => {
    const keys = new Set<string>();
    rolePermissions.forEach((perm) => keys.add(perm.permission));
    return Array.from(keys).sort();
  }, [rolePermissions]);

  const userOverrideMap = useMemo(() => {
    const map = new Map<string, UserPermission>();
    userOverrides.forEach((override) => {
      map.set(override.permission, override);
    });
    return map;
  }, [userOverrides]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, string[]>();
    permissionKeys.forEach((permission) => {
      const group = getPermissionGroup(permission);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)?.push(permission);
    });

    const orderedGroups = permissionGroupOrder.filter((group) => groups.has(group));
    const remainingGroups = Array.from(groups.keys())
      .filter((group) => !permissionGroupOrder.includes(group))
      .sort();

    return [...orderedGroups, ...remainingGroups].map((group) => ({
      name: group,
      permissions: (groups.get(group) ?? []).sort(),
    }));
  }, [permissionKeys]);

  const filteredGroupedPermissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupedPermissions
      .map((group) => {
        const permissions = group.permissions.filter((permission) => {
          if (term && !permission.toLowerCase().includes(term)) return false;
          const granted = permissionMap.get(permission)?.granted === true;
          if (filterMode === 'granted') return granted;
          if (filterMode === 'missing') return !granted;
          return true;
        });
        return permissions.length > 0 ? { name: group.name, permissions } : null;
      })
      .filter(Boolean) as { name: string; permissions: string[] }[];
  }, [groupedPermissions, permissionMap, search, filterMode]);

  const permissionStats = useMemo(() => {
    const total = permissionKeys.length;
    let grantedCount = 0;
    permissionKeys.forEach((permission) => {
      if (permissionMap.get(permission)?.granted === true) grantedCount += 1;
    });
    return {
      total,
      granted: grantedCount,
      missing: Math.max(total - grantedCount, 0),
    };
  }, [permissionKeys, permissionMap]);

  const handleTogglePermission = async (permission: string, nextValue: boolean) => {
    const permissionsToToggle = [permission];

    if (permission === 'exams.create') {
      permissionsToToggle.push('exams.update', 'exams.publish');
    }

    try {
      setSaving(permission);

      if (nextValue) {
        for (const perm of permissionsToToggle) {
          const existingPerm = permissionMap.get(perm);
          if (existingPerm?.granted) {
            continue;
          }

          const payload = {
            role: selectedRole,
            permission: perm,
            granted: true,
          };
          await api.post('/org/role-permissions', payload);
        }
        toast.success('Permission granted');
      } else {
        for (const perm of permissionsToToggle) {
          await api.post('/org/role-permissions', {
            role: selectedRole,
            permission: perm,
            granted: false,
          });
        }
        toast.success('Permission removed');
      }

      await loadRolePermissions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const handleGroupToggle = async (groupName: string, groupPermissions: string[], nextValue: boolean) => {
    const permissionsToToggle = [...groupPermissions];

    if (groupName === 'Exams') {
      permissionsToToggle.push('exams.update', 'exams.publish');
    }

    const uniquePermissionsToToggle = Array.from(new Set(permissionsToToggle));

    const pending = uniquePermissionsToToggle.filter((permission) => {
      const existing = permissionMap.get(permission);
      const enabled = Boolean(existing?.granted);
      return nextValue ? !enabled : enabled || Boolean(existing?.id);
    });

    if (pending.length === 0) return;

    try {
      setSaving(`group:${groupName}`);

      for (const permission of pending) {
        const existing = permissionMap.get(permission);
        if (nextValue) {
          if (existing?.granted) continue;
          const payload = {
            role: selectedRole,
            permission,
            granted: true,
          };
          await api.post('/org/role-permissions', payload);
        } else {
          await api.post('/org/role-permissions', {
            role: selectedRole,
            permission,
            granted: false,
          });
        }
      }

      await loadRolePermissions();
      toast.success(`Permissions ${nextValue ? 'granted' : 'cleared'}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permissions');
    } finally {
      setSaving(null);
    }
  };

  const handleUserOverride = async (permission: string, granted: boolean) => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }

    try {
      setOverrideSaving(permission);
      await api.post('/org/user-permissions', {
        user_id: Number(selectedUserId),
        permission,
        granted,
      });
      await loadUserOverrides(selectedUserId);
      toast.success(`Permission ${granted ? 'granted' : 'denied'}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update user override');
    } finally {
      setOverrideSaving(null);
    }
  };

  const handleClearUserOverride = async (permission: string) => {
    const existing = userOverrideMap.get(permission);
    if (!existing?.id) return;

    try {
      setOverrideSaving(`clear:${permission}`);
      await api.delete(`/org/user-permissions/${existing.id}`);
      await loadUserOverrides(selectedUserId);
      toast.success('Override cleared');
    } catch (error) {
      console.error(error);
      toast.error('Failed to clear user override');
    } finally {
      setOverrideSaving(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/users', userForm);
    setUserForm({ email: '', full_name: '', password: '', role: 'teacher', school_id: '' });
    loadUsers();
  };

  const assignCoursesToSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentSchoolId || selectedCourseIds.length === 0) {
      toast.error('Select a school and at least one course');
      return;
    }

    try {
      await api.post(`/org/schools/${selectedAssignmentSchoolId}/course-assignments`, {
        course_ids: selectedCourseIds.map((courseId) => Number(courseId)),
      });
      setSelectedCourseIds([]);
      await loadSchoolCourseAssignments(selectedAssignmentSchoolId);
      await loadClientCourses();
      toast.success('Courses assigned successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign courses');
    }
  };

  const removeCourseAssignment = async (courseId: number) => {
    if (!selectedAssignmentSchoolId) return;

    try {
      await api.delete(`/org/schools/${selectedAssignmentSchoolId}/course-assignments/${courseId}`);
      await loadSchoolCourseAssignments(selectedAssignmentSchoolId);
      toast.success('Course unassigned');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove course assignment');
    }
  };

  const assignExamsToSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentSchoolId || selectedExamIds.length === 0) {
      toast.error('Select a school and at least one exam');
      return;
    }

    try {
      await api.post(`/org/schools/${selectedAssignmentSchoolId}/exam-assignments`, {
        exam_ids: selectedExamIds.map((examId) => Number(examId)),
      });
      setSelectedExamIds([]);
      await loadSchoolExamAssignments(selectedAssignmentSchoolId);
      await loadClientExams();
      toast.success('Exams assigned successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign exams');
    }
  };

  const removeExamAssignment = async (examId: number) => {
    if (!selectedAssignmentSchoolId) return;

    try {
      await api.delete(`/org/schools/${selectedAssignmentSchoolId}/exam-assignments/${examId}`);
      await loadSchoolExamAssignments(selectedAssignmentSchoolId);
      toast.success('Exam unassigned');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove exam assignment');
    }
  };

  const assignQuestionBankProgramsToSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentSchoolId || selectedQuestionBankProgramIds.length === 0) {
      toast.error('Select a school and at least one question bank program');
      return;
    }

    try {
      await api.post(`/org/schools/${selectedAssignmentSchoolId}/question-bank-assignments`, {
        program_ids: selectedQuestionBankProgramIds.map((programId) => Number(programId)),
      });
      setSelectedQuestionBankProgramIds([]);
      await loadSchoolQuestionBankAssignments(selectedAssignmentSchoolId);
      await loadClientQuestionBankPrograms();
      toast.success('Question bank programs assigned successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign question bank programs');
    }
  };

  const removeQuestionBankAssignment = async (programId: number) => {
    if (!selectedAssignmentSchoolId) return;

    try {
      await api.delete(`/org/schools/${selectedAssignmentSchoolId}/question-bank-assignments/${programId}`);
      await loadSchoolQuestionBankAssignments(selectedAssignmentSchoolId);
      toast.success('Question bank assignment removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove question bank assignment');
    }
  };

  const tabs: { key: TabKey; label: string; roles?: string[]; permissions?: string[] }[] = [
    { key: 'schools', label: 'Schools', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'schoolMembers', label: 'School Members', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'courseAssignments', label: 'Course Assignments', roles: ['super_admin', 'client_admin'] },
    { key: 'examAssignments', label: 'Exam & Question Bank Assignments', roles: ['super_admin', 'client_admin'], permissions: ['exams.assign', 'exams.create', 'exams.update', 'exams.publish', 'questions.assign', 'questions.create', 'questions.approve'] },
    { key: 'batches', label: 'Batches', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'batchMembers', label: 'Batch Members', roles: ['super_admin', 'client_admin', 'school_owner', 'teacher'] },
    { key: 'roles', label: 'Role Permissions', roles: ['super_admin', 'client_admin'] },
    { key: 'users', label: 'Users', roles: ['super_admin', 'client_admin', 'school_owner'] },
    { key: 'bulkSetup', label: 'Bulk Upload', roles: ['super_admin', 'client_admin', 'school_owner'] },
  ];
  const clientUser = user as (typeof user & ClientUser) | null;
  const theme = getDashboardTheme(false);
  const brandLogo = clientUser?.logo || spectropyLogo;
  const brandName = clientUser?.client_name || 'Spectropy';
  const dashboardTitle = getRoleDisplayTitle(user?.role);
  const clientMeta = clientUser?.client_name ? `${clientUser.client_name} Client` : null;
  const visibleTabs = tabs.filter((tab) => {
    const roleAllowed = !tab.roles || tab.roles.includes(user?.role || '');
    const permissionAllowed = user?.role === 'super_admin'
      || !tab.permissions
      || tab.permissions.some((permission) => userPermissionSet.has(permission));
    return roleAllowed && permissionAllowed;
  });
  const dashboardPath =
    user?.role === 'super_admin'
      ? '/superadmin/dashboard'
      : user?.role === 'school_owner'
        ? '/school-owner/dashboard'
        : '/admin/dashboard';
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Organization Setup';
  const activeTabSubtitle: Record<TabKey, string> = {
    schools: 'Create and manage schools under your organization.',
    schoolMembers: 'Assign users to schools and define their scope.',
    courseAssignments: 'Assign client courses to schools so school owners see only their own course catalog.',
    examAssignments: 'Assign published exams and question bank programs to selected schools.',
    batches: 'Create and organize batches for schools.',
    batchMembers: 'Manage users enrolled inside each batch.',
    roles: 'Control role-based permissions for organization users.',
    users: 'Create and maintain all organization users.',
    bulkSetup: 'Upload setup data quickly with bulk operations.',
  };
  const tabIcons: Record<TabKey, ReactNode> = {
    schools: <HiOutlineBuildingOffice2 />,
    schoolMembers: <PiUsersBold />,
    courseAssignments: <BiBookOpen />,
    examAssignments: <RiFileList3Line />,
    batches: <BiBookOpen />,
    batchMembers: <PiUsersBold />,
    roles: <RiFileList3Line />,
    users: <PiUsersBold />,
    bulkSetup: <PiChatsCircleBold />,
  };
  const navItems: SidebarNavItem[] = visibleTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      icon: tabIcons[tab.key],
      active: activeTab === tab.key,
      onClick: () => setActiveTab(tab.key),
    }));

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="min-w-0 px-4 py-4 sm:px-6 sm:py-6"
      sidebar={
        <SidebarNav
          brandLogo={brandLogo}
          brandName={brandName}
          title={dashboardTitle}
          brandTag={clientUser?.client_name}
          topAction={
            <button
              type="button"
              onClick={() => {
                navigate(dashboardPath);
                setSidebarOpen(false);
              }}
              className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              <RiHome2Line className="text-base" />
              <span>Back to Dashboard</span>
            </button>
          }
          navItems={navItems}
          userInfo={{
            name: user?.full_name || 'Organization Admin',
            email: user?.email || 'org@lms.com',
            meta: clientMeta,
          }}
          showUserInfo={false}
          showLogout={false}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => setSidebarOpen(true)}
                className={`mb-3 inline-flex md:hidden rounded-lg border px-3 py-2 text-sm font-medium ${theme.secondaryBorderClass}`}
                aria-label="Open menu"
              >
                Menu
              </button>
              <h1 className="text-xl md:text-2xl font-bold">{activeTabLabel}</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">{activeTabSubtitle[activeTab]}</p>
            </div>
          </div>
        </div>
      }
    >
      {activeTab === 'schools' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold">Schools</h3>
            <div className="mt-4 space-y-3">
              {schools.map((school) => (
                <div key={school.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold">{school.name}</div>
                  <div className="text-xs text-slate-500">Code: {school.school_code || '-'}</div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={createSchool} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Create School</h3>
            <div className="mt-4 space-y-3">
              <input
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                placeholder="School name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={schoolForm.school_code}
                onChange={(e) => setSchoolForm({ ...schoolForm, school_code: e.target.value })}
                placeholder="School code"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                Create School
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'schoolMembers' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold">School Members</h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 space-y-3">
              {schoolMembers.map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold">{member.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {member.email} | {member.role_scope}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={addSchoolMember} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Add School Member</h3>
            <div className="mt-4 space-y-3">
              <select
                value={schoolMemberForm.user_id}
                onChange={(e) => setSchoolMemberForm({ ...schoolMemberForm, user_id: e.target.value })}
                disabled={!selectedSchoolId || availableSchoolUsers.length === 0}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">
                  {!selectedSchoolId
                    ? 'Select school first'
                    : availableSchoolUsers.length === 0
                      ? 'No available users'
                      : 'Select user'}
                </option>
                {availableSchoolUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} - {candidate.email} - {candidate.role}
                  </option>
                ))}
              </select>
              <select
                value={schoolMemberForm.role_scope}
                onChange={(e) => setSchoolMemberForm({ ...schoolMemberForm, role_scope: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="school_owner">School Owner</option>
              </select>
              <button
                disabled={!selectedSchoolId || !schoolMemberForm.user_id}
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add Member
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'courseAssignments' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Assigned Courses</h3>
                <p className="text-sm text-slate-500">Courses attached to the selected school.</p>
              </div>
              <select
                value={selectedAssignmentSchoolId}
                onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={`course-assignment-school:${school.id}`} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedAssignmentSchoolId ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Choose a school to review and manage its assigned courses.
              </div>
            ) : loadingCourseAssignments ? (
              <div className="mt-4 text-sm text-slate-500">Loading assignments...</div>
            ) : schoolCourseAssignments.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                No courses assigned yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {schoolCourseAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{assignment.title}</div>
                        {assignment.description && (
                          <div className="mt-1 text-sm text-slate-500">{assignment.description}</div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${assignment.published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {assignment.published ? 'Published' : 'Draft'}
                          </span>
                          {assignment.assigned_at && (
                            <span>Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCourseAssignment(assignment.course_id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={assignCoursesToSchool} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Assign Courses</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select one school and assign one or more client courses to it.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">School</label>
                <select
                  value={selectedAssignmentSchoolId}
                  onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={`course-assign-form-school:${school.id}`} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Available Courses</label>
                <select
                  multiple
                  value={selectedCourseIds}
                  onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((option) => option.value);
                    setSelectedCourseIds(next);
                  }}
                  className="mt-2 h-64 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableCoursesForAssignment.map((course) => (
                    <option key={`assign-course:${course.id}`} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Hold Ctrl/Cmd to select multiple courses.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Assign Selected Courses
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'examAssignments' && (
        <section className="mt-6 space-y-6">
          {canAssignExams && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Assigned Exams</h3>
                <p className="text-sm text-slate-500">Published exams attached to the selected school.</p>
              </div>
              <select
                value={selectedAssignmentSchoolId}
                onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={`exam-assignment-school:${school.id}`} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedAssignmentSchoolId ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Choose a school to review and manage its assigned exams.
              </div>
            ) : loadingExamAssignments ? (
              <div className="mt-4 text-sm text-slate-500">Loading assignments...</div>
            ) : schoolExamAssignments.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                No exams assigned yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {schoolExamAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{assignment.title}</div>
                        {assignment.description && (
                          <div className="mt-1 text-sm text-slate-500">{assignment.description}</div>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                            {assignment.status || 'published'}
                          </span>
                          {assignment.assigned_at && (
                            <span>Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExamAssignment(assignment.exam_id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={assignExamsToSchool} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Assign Exams</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select one school and assign one or more published exams to it.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">School</label>
                <select
                  value={selectedAssignmentSchoolId}
                  onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={`exam-assign-form-school:${school.id}`} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Available Exams</label>
                <select
                  multiple
                  value={selectedExamIds}
                  onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((option) => option.value);
                    setSelectedExamIds(next);
                  }}
                  className="mt-2 h-64 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableExamsForAssignment.map((exam) => (
                    <option key={`assign-exam:${exam.id}`} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Hold Ctrl/Cmd to select multiple published exams.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Assign Selected Exams
              </button>
            </div>
          </form>
          </div>
          )}

          {canAssignQuestionBank && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Assigned Question Bank</h3>
                  <p className="text-sm text-slate-500">Question bank programs attached to the selected school.</p>
                </div>
                <select
                  value={selectedAssignmentSchoolId}
                  onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={`question-bank-assignment-school:${school.id}`} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedAssignmentSchoolId ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  Choose a school to review and manage its assigned question bank.
                </div>
              ) : loadingQuestionBankAssignments ? (
                <div className="mt-4 text-sm text-slate-500">Loading assignments...</div>
              ) : schoolQuestionBankAssignments.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  No question bank programs assigned yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {schoolQuestionBankAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{assignment.name}</div>
                          {assignment.code && (
                            <div className="mt-1 text-sm text-slate-500">{assignment.code}</div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                              {assignment.is_active === false ? 'Inactive' : 'Active'}
                            </span>
                            {assignment.assigned_at && (
                              <span>Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestionBankAssignment(assignment.program_id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={assignQuestionBankProgramsToSchool} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold">Assign Question Bank</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select one school and assign one or more question bank programs to it.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">School</label>
                  <select
                    value={selectedAssignmentSchoolId}
                    onChange={(e) => setSelectedAssignmentSchoolId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={`question-bank-assign-form-school:${school.id}`} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Available Programs</label>
                  <select
                    multiple
                    value={selectedQuestionBankProgramIds}
                    onChange={(e) => {
                      const next = Array.from(e.target.selectedOptions).map((option) => option.value);
                      setSelectedQuestionBankProgramIds(next);
                    }}
                    className="mt-2 h-64 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {availableQuestionBankProgramsForAssignment.map((program) => (
                      <option key={`assign-question-bank-program:${program.id}`} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Hold Ctrl/Cmd to select multiple question bank programs.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Assign Selected Programs
                </button>
              </div>
            </form>
          </div>
          )}
        </section>
      )}

      {activeTab === 'batches' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold">Batches</h3>
            <div className="mt-4 space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold">{batch.name}</div>
                  <div className="text-xs text-slate-500">School ID: {batch.school_id}</div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={createBatch} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Create Batch</h3>
            <div className="mt-4 space-y-3">
              <select
                value={batchForm.school_id}
                onChange={(e) => setBatchForm({ ...batchForm, school_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <input
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                placeholder="Batch name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                Create Batch
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'batchMembers' && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold">Batch Members</h3>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
            <div className="mt-4 space-y-3">
              {batchMembers.map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold">{member.full_name}</div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={addBatchMember} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Add Batch Member</h3>
            <div className="mt-4 space-y-3">
              <select
                value={batchMemberForm.user_id}
                onChange={(e) => setBatchMemberForm({ ...batchMemberForm, user_id: e.target.value })}
                disabled={!selectedBatchId || availableBatchUsers.length === 0}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">
                  {!selectedBatchId
                    ? 'Select batch first'
                    : availableBatchUsers.length === 0
                      ? 'No available users'
                      : 'Select user'}
                </option>
                {availableBatchUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} - {candidate.email} - {candidate.role}
                  </option>
                ))}
              </select>
              <button
                disabled={!selectedBatchId || !batchMemberForm.user_id}
                className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add Member
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'roles' && (
        <section className="mt-6 space-y-6">
          <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Role Permissions</h3>
                <p className="text-sm text-slate-500">Manage permissions for client roles with the full client catalog.</p>
              </div>
              <div className="min-w-[220px]">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{permissionStats.total}</div>
                <div className="text-xs text-slate-500">Catalog permissions</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Granted</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-700">{permissionStats.granted}</div>
                <div className="text-xs text-emerald-700/70">Enabled for this role</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Missing</div>
                <div className="mt-2 text-2xl font-semibold text-rose-700">{permissionStats.missing}</div>
                <div className="text-xs text-rose-700/70">Not granted</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${filterMode === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('granted')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${filterMode === 'granted'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                    }`}
                >
                  Granted
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('missing')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${filterMode === 'missing'
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                    }`}
                >
                  Not granted
                </button>
              </div>
              <div className="w-full md:w-64">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 min-w-0 space-y-6">
                {filteredGroupedPermissions.length === 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-600">
                    No permissions match your filters.
                  </div>
                )}
                {filteredGroupedPermissions.map((group) => {
                  const isGroupSaving = saving === `group:${group.name}`;
                  return (
                    <div key={group.name} className="min-w-0 w-full rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                        <div className="text-xs text-slate-500">
                          {group.permissions.length} permission{group.permissions.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(group.name, group.permissions, true)}
                          disabled={Boolean(saving)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(group.name, group.permissions, false)}
                          disabled={Boolean(saving)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Clear all
                        </button>
                        {isGroupSaving && <span className="text-xs text-slate-400">Saving...</span>}
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {group.permissions
                        .filter((permission) => !['exams.update', 'exams.publish'].includes(permission))
                        .map((permission) => {
                          const existing = permissionMap.get(permission);
                          const enabled = Boolean(existing?.granted);
                          const isSaving = saving === permission || Boolean(saving?.startsWith('group:'));

                          return (
                            <div
                              key={permission}
                              className="flex min-w-0 w-full items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-sm font-semibold text-slate-900">{permission}</div>
                                <div className="text-xs text-slate-500">
                                  {enabled ? 'Granted' : 'Not granted'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTogglePermission(permission, !enabled)}
                                disabled={isSaving}
                                aria-pressed={enabled}
                                className={`relative ml-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                                  enabled ? 'bg-emerald-500' : 'bg-slate-200'
                                } ${isSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                    enabled ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">User Overrides</h3>
                <p className="text-sm text-slate-500">Grant or deny permissions for a specific client user.</p>
              </div>
              <div className="w-full min-w-0 md:w-auto md:min-w-[220px]">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">School</label>
                <select
                  value={selectedOverrideSchoolId}
                  onChange={(e) => setSelectedOverrideSchoolId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All schools</option>
                  {schools.map((school) => (
                    <option key={`override-school:${school.id}`} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full min-w-0 md:w-auto md:min-w-[280px]">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Choose user</option>
                  {availableOverrideUsers.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.full_name} ({candidate.email})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Showing {selectedRole.replace('_', ' ')} users
                  {selectedOverrideSchoolId ? ' in the selected school' : ' across this client'}.
                </p>
              </div>
            </div>

            {!selectedUserId && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                Select a user to manage overrides.
              </div>
            )}

            {selectedUserId && (
              <div className="mt-6 min-w-0 space-y-6">
                {groupedPermissions.map((group) => (
                  <div key={`override:${group.name}`} className="min-w-0 w-full rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {group.permissions
                        .filter((permission) => !['exams.update', 'exams.publish'].includes(permission))
                        .map((permission) => {
                          const override = userOverrideMap.get(permission);
                          const state = override ? (override.granted ? 'Granted' : 'Denied') : 'Inherited';
                          const isSaving =
                            overrideSaving === permission || overrideSaving === `clear:${permission}`;

                          return (
                            <div
                              key={`override:${permission}`}
                              className="min-w-0 w-full rounded-2xl border border-slate-100 bg-white p-4"
                            >
                              <div className="break-words text-sm font-semibold text-slate-900">{permission}</div>
                              <div className="text-xs text-slate-500">{state}</div>
                              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUserOverride(permission, true)}
                                  disabled={isSaving}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Grant
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUserOverride(permission, false)}
                                  disabled={isSaving}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Deny
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClearUserOverride(permission)}
                                  disabled={isSaving || !override}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}


      {
        activeTab === 'users' && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold">Users</h3>
              <div className="mt-4 space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email} | {u.role}</div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createUser} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold">Create User</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <input
                  value={userForm.school_id}
                  onChange={(e) => setUserForm({ ...userForm, school_id: e.target.value })}
                  placeholder="School ID (optional)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">
                  Create User
                </button>
              </div>
            </form>
          </section>
        )
      }

      {
        activeTab === 'bulkSetup' && (
          <section className="mt-6">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-lg font-semibold">Bulk Upload Workspace</h3>
              <BulkSetup />
            </div>
          </section>
        )
      }
    </DashboardLayout >
  );
}



