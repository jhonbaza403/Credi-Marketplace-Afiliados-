begin;

grant execute on function private.credichat_member_profile_ids(uuid[]) to authenticated;

commit;
