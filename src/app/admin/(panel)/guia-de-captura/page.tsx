import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui'

export const metadata: Metadata = { title: 'Guia de captura' }

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <li className="grid grid-cols-[2rem_1fr] gap-3">
    <span className="grid size-8 place-items-center rounded-full border border-line font-mono text-[13px] text-silver-2">{n}</span>
    <div>
      <p className="text-[15px] text-silver-1">{title}</p>
      <div className="mt-1 space-y-1 text-[14px] text-silver-3">{children}</div>
    </div>
  </li>
)

const Block = ({ id, title, lead, children }: { id: string; title: string; lead: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20 rounded-lg border border-line bg-ink-1 p-4 md:p-6">
    <h2 className="title text-[19px]">{title}</h2>
    <p className="mt-1 max-w-[65ch] text-[14px] text-silver-3">{lead}</p>
    <div className="mt-5">{children}</div>
  </section>
)

export default function CaptureGuidePage() {
  return (
    <>
      <PageHeader
        title="Guia de captura"
        description="Como fotografar e escanear cada aparelho para a vitrine mostrar a unidade real, com as marcas de uso que ela tem."
      />
      <div className="space-y-4">
        <Block id="preparar" title="Antes de começar" lead="Vale para fotos, giro 360° e escaneamento.">
          <ol className="space-y-4">
            <Step n={1} title="Proteja os dados do cliente anterior">
              <p>Restaure o aparelho para as configurações de fábrica e retire o chip e o cartão de memória.</p>
              <p>Nunca fotografe o IMEI, o número de série ou a tela de bloqueio com notificações.</p>
            </Step>
            <Step n={2} title="Limpe sem esconder defeitos">
              <p>Tire poeira e marcas de dedo com um pano de microfibra seco. Não use capa, película nova ou adesivo que cubra arranhões.</p>
            </Step>
            <Step n={3} title="Monte um cantinho fixo">
              <p>Fundo liso e fosco (cartolina cinza ou branca), luz indireta de janela ou duas luminárias com difusor, uma de cada lado.</p>
              <p>Evite sol direto e luz de teto forte: elas criam reflexos que escondem trincas e riscos.</p>
            </Step>
            <Step n={4} title="Use sempre o mesmo celular para fotografar">
              <p>Apoie em um tripé ou em uma pilha de livros, a uns 40 cm do aparelho. Desligue o flash e o zoom digital.</p>
            </Step>
          </ol>
        </Block>

        <Block id="giro-360" title="Giro 360° por fotos (recomendado)" lead="É o jeito mais fiel de mostrar a unidade real: o cliente gira o aparelho na tela e vê cada lado, com as marcas verdadeiras.">
          <ol className="space-y-4">
            <Step n={1} title="Use uma base giratória">
              <p>Um prato giratório de bolo ou um suporte giratório barato resolve. Marque 36 pontos na borda, um a cada 10°, ou 24 pontos, um a cada 15°.</p>
            </Step>
            <Step n={2} title="Deixe o aparelho em pé e centralizado">
              <p>Use um suporte transparente ou um pouco de massinha atrás. O centro do aparelho deve ficar no centro da base.</p>
            </Step>
            <Step n={3} title="Trave foco e exposição">
              <p>No iPhone e na maioria dos Android, toque e segure sobre o aparelho na tela da câmera até aparecer o aviso de bloqueio. Assim todas as fotos ficam com o mesmo brilho.</p>
            </Step>
            <Step n={4} title="Fotografe girando sempre para o mesmo lado">
              <p>Tire uma foto, gire até a próxima marca e repita, até completar a volta. Não mexa na câmera durante a sequência.</p>
            </Step>
            <Step n={5} title="Envie a sequência">
              <p>No produto, em <strong className="text-silver-2">Fotos</strong>, use <strong className="text-silver-2">Enviar sequência 360°</strong> e selecione todas as fotos de uma vez. O painel põe na ordem pelo nome do arquivo, que é a ordem em que foram tiradas.</p>
            </Step>
            <Step n={6} title="Leia o parecer do analista">
              <p>Logo abaixo da sequência, o analista do painel confere cada quadro: nitidez, luz, reflexos, posição do aparelho e quantidade de fotos. Ele diz se a sequência está aprovada, se pode melhorar ou se precisa ser refeita, e aponta os quadros com problema.</p>
              <p>O analista é automático e não substitui o seu olhar: antes de publicar, gire a sequência na prévia.</p>
            </Step>
          </ol>
        </Block>

        <Block id="avarias" title="Fotos das marcas de uso" lead="Além do giro, mostre cada defeito de perto. Isso evita devolução e passa confiança.">
          <ol className="space-y-4">
            <Step n={1} title="Uma foto por marca">
              <p>Trinca, risco, amassado ou pintura descascada: chegue perto e fotografe com a luz vindo de lado, para o relevo aparecer.</p>
            </Step>
            <Step n={2} title="Tela acesa e apagada">
              <p>Uma foto da tela apagada mostra riscos. Outra, acesa em fundo branco, mostra manchas e pixels mortos.</p>
            </Step>
            <Step n={3} title="Descreva o que a foto mostra">
              <p>No texto alternativo de cada foto, escreva o que ela mostra, por exemplo &quot;risco leve no canto inferior da tela&quot;.</p>
            </Step>
          </ol>
        </Block>

        <Block id="escanear" title="Escaneamento 3D (opcional, avançado)" lead="Gera um modelo 3D da própria unidade. Funciona melhor em aparelhos com traseira fosca. Tela de vidro e acabamentos espelhados costumam sair com buracos ou ondulações.">
          <ol className="space-y-4">
            <Step n={1} title="Escolha um app que exporte GLB">
              <p>Apps como Polycam, Scaniverse e KIRI Engine escaneiam objetos pelo celular. Antes de começar, confira se o seu plano permite exportar em GLB.</p>
            </Step>
            <Step n={2} title="Capture com calma">
              <p>Use o modo de objeto, com o mesmo cantinho e a mesma luz das fotos. Dê duas voltas completas em alturas diferentes e depois vire o aparelho para capturar a outra face.</p>
            </Step>
            <Step n={3} title="Exporte leve">
              <p>Exporte em GLB com até 8 MB, que carrega bem no celular do cliente. O limite do painel é 30 MB.</p>
            </Step>
            <Step n={4} title="Envie no produto">
              <p>Em <strong className="text-silver-2">Modelo 3D</strong>, use <strong className="text-silver-2">Enviar GLB</strong>. Desligue <strong className="text-silver-2">Modelo ilustrativo</strong> somente se o escaneamento ficou fiel a esta unidade.</p>
            </Step>
            <Step n={5} title="Confira antes de publicar">
              <p>Gire o modelo na prévia. Se ele estiver deformado ou com buracos, retire e use só o giro 360° e as fotos: um modelo ruim passa menos confiança do que boas fotos.</p>
            </Step>
          </ol>
        </Block>

        <Block id="publicar" title="Antes de publicar" lead="Confira em um minuto.">
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-silver-3">
            <li>Nenhuma foto mostra IMEI, número de série ou dados pessoais.</li>
            <li>Todas as marcas de uso descritas no anúncio aparecem em alguma foto.</li>
            <li>O giro 360° está na ordem certa e sem saltos.</li>
            <li>A condição do aparelho escolhida no produto bate com as fotos.</li>
          </ul>
        </Block>
      </div>
    </>
  )
}
