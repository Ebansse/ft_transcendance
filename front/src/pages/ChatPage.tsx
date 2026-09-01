import { useEffect, useState } from 'react'
import { useAuthModal } from '../auth/authModalContext.ts'
import { AppLayout } from '../components/AppLayout.tsx'
import { ConfirmModal } from '../components/ConfirmModal.tsx'
import { EditUserModal } from '../components/EditUserModal.tsx'
import { MenuActions } from '../components/MenuActions.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { SectionTitle } from '../components/SectionTitle.tsx'
import { Tableau, type Colonne } from '../components/Tableau.tsx'
import {
} from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import s from './ChatPage.module.css'

