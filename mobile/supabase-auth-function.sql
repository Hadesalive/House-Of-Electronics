-- ============================================
-- Supabase Authentication Function for Mobile App
-- House of Electronics
-- ============================================

-- This function authenticates users against the users table
-- and returns user data (without password hash) on successful login

CREATE OR REPLACE FUNCTION mobile_user_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_password_hash TEXT;
  v_result JSON;
BEGIN
  -- Hash the provided password using SHA-256 (matching desktop app)
  v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
  
  -- Find user by username and check if active
  SELECT * INTO v_user
  FROM users
  WHERE username = p_username 
    AND is_active = 1
    AND deleted_at IS NULL;
  
  -- Check if user exists
  IF v_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;
  
  -- Verify password hash
  IF v_user.password_hash != v_password_hash THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid username or password'
    );
  END IF;
  
  -- Update last login timestamp
  UPDATE users 
  SET last_login = NOW()
  WHERE id = v_user.id;
  
  -- Return success with user data (excluding password_hash)
  v_result := json_build_object(
    'success', true,
    'data', json_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'fullName', v_user.full_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'role', v_user.role,
      'employeeId', v_user.employee_id,
      'isActive', v_user.is_active = 1,
      'createdAt', v_user.created_at,
      'updatedAt', v_user.updated_at,
      'lastLogin', NOW()
    )
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred during authentication'
    );
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION mobile_user_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mobile_user_login(TEXT, TEXT) TO authenticated;

-- ============================================
-- Change Password Function
-- ============================================

CREATE OR REPLACE FUNCTION mobile_change_password(
  p_user_id TEXT,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_current_hash TEXT;
  v_new_hash TEXT;
BEGIN
  -- Hash the provided current password
  v_current_hash := encode(digest(p_current_password, 'sha256'), 'hex');
  
  -- Hash the new password
  v_new_hash := encode(digest(p_new_password, 'sha256'), 'hex');
  
  -- Find user and verify current password
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id
    AND is_active = 1
    AND deleted_at IS NULL;
  
  IF v_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Verify current password
  IF v_user.password_hash != v_current_hash THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Current password is incorrect'
    );
  END IF;
  
  -- Update password
  UPDATE users 
  SET password_hash = v_new_hash,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password changed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred while changing password'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION mobile_change_password(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mobile_change_password(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================
-- Get Current User Function
-- ============================================

CREATE OR REPLACE FUNCTION mobile_get_user(
  p_user_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Find user by ID
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id
    AND is_active = 1
    AND deleted_at IS NULL;
  
  IF v_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Return user data (excluding password_hash)
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'fullName', v_user.full_name,
      'email', v_user.email,
      'phone', v_user.phone,
      'role', v_user.role,
      'employeeId', v_user.employee_id,
      'isActive', v_user.is_active = 1,
      'createdAt', v_user.created_at,
      'updatedAt', v_user.updated_at,
      'lastLogin', v_user.last_login
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION mobile_get_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mobile_get_user(TEXT) TO authenticated;

-- ============================================
-- Instructions
-- ============================================

-- To use these functions from your mobile app:
--
-- 1. Login:
--    const { data, error } = await supabase.rpc('mobile_user_login', {
--      p_username: 'admin',
--      p_password: 'password123'
--    });
--
-- 2. Change Password:
--    const { data, error } = await supabase.rpc('mobile_change_password', {
--      p_user_id: userId,
--      p_current_password: 'oldPass',
--      p_new_password: 'newPass'
--    });
--
-- 3. Get User:
--    const { data, error } = await supabase.rpc('mobile_get_user', {
--      p_user_id: userId
--    });

