import React from "react";

interface UserInfoCardProps {
  name: string;
  email: string;
  meta?: string | null;
  wrapperClassName: string;
  innerClassName: string;
  avatarClassName: string;
  avatarTextClassName: string;
}

export default function UserInfoCard({
  name,
  email,
  meta,
  wrapperClassName,
  innerClassName,
  avatarClassName,
  avatarTextClassName,
}: UserInfoCardProps) {
  return (
    <div className={wrapperClassName}>
      <div className={innerClassName}>
        <div className={avatarClassName}>
          <span className={avatarTextClassName}>
            {name?.charAt(0).toUpperCase() || "U"}
          </span>
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-m font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
          {meta && <p className="text-[11px] text-gray-500 truncate">{meta}</p>}
        </div>
      </div>
    </div>
  );
}
