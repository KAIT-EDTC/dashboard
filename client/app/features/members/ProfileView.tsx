import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { DiscordIcon, ExternalLinkIcon, GitHubIcon, LinkIcon } from '~/components/ui/Icons'
import { formatDate, fullName } from '~/lib/format'
import { MemberBadges } from './MemberBadges'
import type { MemberProfile } from './types'

const LINKS: { key: 'github' | 'x' | 'instagram' | 'website'; label: string; href: (v: string) => string; icon: ReactNode }[] = [
  { key: 'github', label: 'GitHub', href: (v) => `https://github.com/${v}`, icon: <GitHubIcon size={16} /> },
  { key: 'x', label: 'X', href: (v) => `https://x.com/${v}`, icon: <LinkIcon size={16} /> },
  { key: 'instagram', label: 'Instagram', href: (v) => `https://instagram.com/${v}`, icon: <LinkIcon size={16} /> },
  { key: 'website', label: 'Web', href: (v) => v, icon: <ExternalLinkIcon size={16} /> },
]

export function ProfileView({ profile, actions }: { profile: MemberProfile; actions?: ReactNode }) {
  const { member, posts } = profile
  const links = LINKS.filter((link) => member.links[link.key])

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      <section className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'lg' })}>
        <Avatar user={member} size={96} />
        <div className={css({ flex: 1, minW: '220px', display: 'flex', flexDirection: 'column', gap: 'xs' })}>
          <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>
            {member.lastNameKana} {member.firstNameKana}
          </p>
          <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>
            {fullName(member)}
            {member.nickname && <span className={css({ ml: 'sm', fontSize: 'lg', color: 'fg.muted' })}>（{member.nickname}）</span>}
          </h1>
          <p className={css({ display: 'flex', alignItems: 'center', gap: 'xs', fontSize: 'sm', color: 'fg.muted' })}>
            <DiscordIcon size={16} className={css({ color: 'discord' })} />@{member.discordUsername}
          </p>
          <MemberBadges member={member} />
          {member.headline && <p className={css({ mt: 'xs', fontWeight: '500' })}>{member.headline}</p>}
        </div>
        {actions}
      </section>

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '2fr 1fr' }, gap: 'lg', alignItems: 'start' })}>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Card title="自己紹介">
            {member.bio ? (
              <p className={css({ whiteSpace: 'pre-wrap', lineHeight: '1.8' })}>{member.bio}</p>
            ) : (
              <p className={css({ color: 'fg.subtle', fontSize: 'sm' })}>まだ自己紹介が書かれていません</p>
            )}
          </Card>
          <Card title="書いたブログ記事" padded={false}>
            {posts.length === 0 ? (
              <EmptyState title="公開された記事はまだありません" />
            ) : (
              <ul>
                {posts.map((post) => (
                  <li key={post.id} className={css({ borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
                    <Link to={`/blog/${post.id}`} className={css({ display: 'flex', justifyContent: 'space-between', gap: 'md', px: 'lg', py: '12px', color: 'fg', _hover: { bg: 'surface.subtle', color: 'fg' } })}>
                      <span className={css({ fontWeight: '500' })}>{post.title}</span>
                      {post.eventDate && <span className={css({ fontSize: 'sm', color: 'fg.subtle', flexShrink: 0 })}>{formatDate(post.eventDate, { withYear: true })}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Card title="所属">
            <dl className={css({ display: 'grid', gap: 'sm', fontSize: 'sm', '& dt': { color: 'fg.subtle', fontSize: 'xs', fontWeight: '600' } })}>
              <div><dt>学部・学科</dt><dd>{member.faculty} {member.department}</dd></div>
              <div><dt>入学年度</dt><dd>{member.enrollmentYear}年度</dd></div>
            </dl>
          </Card>
          {member.interests.length > 0 && (
            <Card title="興味・趣味">
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
                {member.interests.map((interest) => (
                  <span key={interest} className={css({ px: '10px', py: '2px', fontSize: 'sm', bg: 'surface.muted', borderRadius: 'full' })}>
                    #{interest}
                  </span>
                ))}
              </div>
            </Card>
          )}
          {links.length > 0 && (
            <Card title="リンク">
              <ul className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
                {links.map((link) => {
                  const value = member.links[link.key]!
                  return (
                    <li key={link.key}>
                      <a href={link.href(value)} target="_blank" rel="noopener noreferrer" className={css({ display: 'inline-flex', alignItems: 'center', gap: 'sm', fontSize: 'sm' })}>
                        {link.icon}
                        {link.label}: {value}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
