import { useLoaderData, useNavigate, Link  } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from "~/lib/auth-store";
import type { Route } from "./+types/list";
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

export function meta({}: Route.MetaArgs) {
  return [
    { title: "애창곡" },
    { name: "description", content: "나의 애창곡 리스트" },
  ];
}

export async function clientLoader() {

  //-------------------------------------------------------
  // 세션 확인
  //-------------------------------------------------------
  if (useAuthStore.getState().status === "loading") {
    // 로그인 상태가 아직 로딩 중이면, 세션을 확인하고 상태를 업데이트
    const { data: { session } } = await supabase.auth.getSession()
    useAuthStore.getState().setSession(session)
  }
}

// 로딩 화면. HydrateFallback 이름 정해져 있음
export function HydrateFallback() {
  return <div>로그인 세션 연결 중...</div>
}

// 오류 화면. ErrorBoundary 이름 정해져 있음
export function ErrorBoundary() {
  return <div>오류 발생</div>
}

export default function List() {
  const user = useAuthStore(s => s.user)
  const githubSignIn = useAuthStore(s => s.githubSignIn)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const {data: songs = [], isPending, isError, error} = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const {data, error} = await supabase.from('songs').select('*')
      if(error) throw new Error(error.message)
      return data
    },
    enabled: !!user,
    staleTime: 1000*60*5
  })

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      const {error} = await supabase.from('songs').delete().eq('id', songId)
      if(error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['songs']})
    },
    onError: (err: any) => {
      alert(`노래 삭제 실패: ${err.message}`)
    }
  })

  return (
    <div>
      <h2>애창곡 리스트 {user && `(${user.email})`}</h2>
      
      {user ? (
        isPending ? (
          <p>노래 데이터 불러오는 중 ... </p>
        ) : isError ? (
          <p>에러 발생 : {error.message}</p>
        ) : (
          <div>
          <button 
            onClick={ async () => {
              await useAuthStore.getState().signOut()
              // alert("로그아웃")
              queryClient.clear()
              navigate('/')
            }}>
            로그아웃
          </button>

          {songs.length === 0 ? (
            <p>등록된 노래가 없거나 데이터를 불러오지 못했습니다.</p>
          ) : (
            <ul>
              {songs.map((song: any) => (
                <li key={song.id}>
                  <strong>{song.title}</strong> - {song.artist || '(가수 없음)'}
                  <button
                    disabled={deleteSongMutation.isPending}
                    onClick={() => {
                      if(confirm(`'${song.title}' 노래를 삭제하시겠습니까?`)){
                        deleteSongMutation.mutate(song.id)
                      }
                    }}>삭제
                    </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    ) : (
        <div>
          <button 
            onClick={() => navigate('/login')}>
            로그인
          </button>

          <button 
            onClick={() => navigate('/signup')}>
            Email 회원가입
          </button>
        </div>
      )}     
    </div>
  )
}
